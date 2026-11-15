package org.meshtastic.sdk.js

import kotlinx.coroutines.flow.first
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.coroutines.promise
import kotlinx.coroutines.withTimeout
import org.meshtastic.sdk.Frame
import org.meshtastic.sdk.TransportState
import kotlin.test.AfterTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue
import kotlin.js.Promise

/**
 * Drives the transport with a scripted `navigator.serial`. Ports are plain JS
 * objects shaped like `SerialPort`; the fake serial API records whether
 * `requestPort` was ever called.
 */
class WebSerialTransportTest {
    @AfterTest
    fun restore() {
        js("delete globalThis.navigator")
    }

    private fun installNavigator(navigator: dynamic) {
        js("Object.defineProperty(globalThis, 'navigator', { value: navigator, configurable: true, writable: true })")
    }

    private fun installSerial(ports: Array<dynamic>): dynamic {
        val serial = js(
            """({
                requested: 0,
                listeners: {},
                addEventListener: function (type, cb) { (this.listeners[type] = this.listeners[type] || []).push(cb); },
                removeEventListener: function (type, cb) { this.listeners[type] = (this.listeners[type] || []).filter(function (l) { return l !== cb; }); },
                listenerCount: function () { var n = 0; for (var k in this.listeners) n += this.listeners[k].length; return n; },
                dispatch: function (type, port) { (this.listeners[type] || []).forEach(function (cb) { cb({ target: port }); }); },
                requestPort: function () { this.requested++; return Promise.reject(new Error('prompted')); }
            })""",
        )
        serial.ports = ports
        serial.getPorts = { Promise.resolve<dynamic>(serial.ports) }
        val navigator = js("({})")
        navigator.serial = serial
        installNavigator(navigator)
        return serial
    }

    private fun fakePort(vendor: Int, product: Int): dynamic {
        val port = js(
            """({
                readable: null, writable: null, written: [], opens: 0, closes: 0,
                open: function () {
                    var self = this;
                    self.opens++;
                    self.readable = new ReadableStream({ start: function (c) { self.reader = c; } });
                    self.writable = new WritableStream({ write: function (chunk) { self.written.push(chunk); } });
                    return Promise.resolve();
                },
                close: function () { this.closes++; this.readable = null; this.writable = null; return Promise.resolve(); },
                setSignals: function () { return Promise.resolve(); },
                push: function (bytes) { this.reader.enqueue(bytes); },
                end: function () { this.reader.close(); }
            })""",
        )
        val info = js("({})")
        info.usbVendorId = vendor
        info.usbProductId = product
        port.getInfo = { info }
        return port
    }

    @Test
    fun reopens_the_one_permitted_port_matching_the_saved_ids_without_prompting() = GlobalScope.promise {
        val other = fakePort(0x10c4, 0xea60)
        val radio = fakePort(0x303a, 0x1001)
        val serial = installSerial(arrayOf(other, radio))
        val transport = WebSerialTransport(null, 0x303a, 0x1001)

        transport.connect()

        assertEquals(TransportState.Connected, transport.state.value)
        assertEquals(1, radio.opens)
        assertEquals(0, other.opens)
        assertEquals(0, serial.requested)
        transport.disconnect()
        assertEquals(1, radio.closes)
    }

    @Test
    fun uses_the_port_a_gesture_handed_over() = GlobalScope.promise {
        val radio = fakePort(0x303a, 0x1001)
        val serial = installSerial(arrayOf())
        val transport = WebSerialTransport(radio, 0x303a, 0x1001)

        transport.connect()

        assertEquals(1, radio.opens)
        assertEquals(0, serial.requested)
        transport.disconnect()
    }

    @Test
    fun fails_without_prompting_when_no_permitted_port_matches() = GlobalScope.promise {
        val serial = installSerial(arrayOf(fakePort(0x10c4, 0xea60)))
        val transport = WebSerialTransport(null, 0x303a, 0x1001)

        val failure = assertFailsWith<ClientException> { transport.connect() }

        assertEquals("serial-unavailable", failure.kind)
        assertEquals(0, serial.requested)
        assertEquals(TransportState.Disconnected, transport.state.value)
    }

    @Test
    fun refuses_to_guess_between_ports_sharing_the_ids() = GlobalScope.promise {
        installSerial(arrayOf(fakePort(0x303a, 0x1001), fakePort(0x303a, 0x1001)))

        val failure = assertFailsWith<ClientException> { WebSerialTransport(null, 0x303a, 0x1001).connect() }

        assertEquals("serial-unavailable", failure.kind)
    }

    @Test
    fun reports_a_missing_api_clearly() = GlobalScope.promise {
        installNavigator(js("({})"))

        val failure = assertFailsWith<ClientException> { WebSerialTransport(null, 0x303a, 0x1001).connect() }

        assertEquals("serial-unsupported", failure.kind)
    }

    @Test
    fun frames_incoming_bytes_and_writes_outgoing_frames_raw() = GlobalScope.promise {
        val radio = fakePort(0x303a, 0x1001)
        installSerial(arrayOf(radio))
        val transport = WebSerialTransport(null, 0x303a, 0x1001)
        transport.connect()

        val payload = byteArrayOf(0x08, 0x01)
        radio.push(framed(payload).toByteArray().toUint8Array())
        val frame = withTimeout(1_000) { transport.frames().first() }
        assertEquals(Frame(framed(payload)), frame)

        transport.send(Frame(framed(byteArrayOf(0x10))))
        assertEquals(1, radio.written.length as Int)
        assertEquals(listOf(0x94.toByte(), 0xC3.toByte(), 0, 1, 0x10), (radio.written[0] as org.khronos.webgl.Uint8Array).toByteArray().toList())
        transport.disconnect()
    }

    @Test
    fun an_os_disconnect_is_a_recoverable_error_and_a_replug_reconnects() = GlobalScope.promise {
        val radio = fakePort(0x303a, 0x1001)
        val serial = installSerial(arrayOf(radio))
        val transport = WebSerialTransport(null, 0x303a, 0x1001)
        transport.connect()

        serial.dispatch("disconnect", radio)
        val error = withTimeout(1_000) { transport.state.first { it is TransportState.Error } } as TransportState.Error
        assertTrue(error.recoverable)
        assertEquals("serial-disconnected", (error.cause as ClientException).kind)

        transport.disconnect()
        val replugged = fakePort(0x303a, 0x1001)
        serial.ports = arrayOf(replugged)
        serial.dispatch("connect", replugged)
        transport.connect()

        assertEquals(TransportState.Connected, transport.state.value)
        assertEquals(1, replugged.opens)
        assertEquals(0, serial.requested)
        transport.disconnect()
    }

    @Test
    fun releases_its_serial_listeners_on_disconnect_and_on_a_failed_connect() = GlobalScope.promise {
        val radio = fakePort(0x303a, 0x1001)
        val serial = installSerial(arrayOf(radio))
        val transport = WebSerialTransport(null, 0x303a, 0x1001)

        transport.connect()
        assertEquals(2, serial.listenerCount() as Int)
        transport.disconnect()
        assertEquals(0, serial.listenerCount() as Int)

        transport.connect()
        transport.disconnect()
        assertEquals(0, serial.listenerCount() as Int)

        serial.ports = arrayOf<dynamic>()
        assertFailsWith<ClientException> { WebSerialTransport(null, 0x303a, 0x1001).connect() }
        assertEquals(0, serial.listenerCount() as Int)
    }

    @Test
    fun frames_read_by_the_old_link_do_not_reach_the_next_connect() = GlobalScope.promise {
        val radio = fakePort(0x303a, 0x1001)
        installSerial(arrayOf(radio))
        val transport = WebSerialTransport(null, 0x303a, 0x1001)
        transport.connect()
        radio.push(framed(byteArrayOf(0x08, 0x01)).toByteArray().toUint8Array())
        delay(50)

        transport.disconnect()
        transport.connect()

        assertEquals(null, withTimeoutOrNull(100) { transport.frames().first() })
        transport.disconnect()
    }

    @Test
    fun a_port_left_open_is_closed_before_reopening() = GlobalScope.promise {
        val radio = fakePort(0x303a, 0x1001)
        radio.open()
        installSerial(arrayOf(radio))
        val transport = WebSerialTransport(null, 0x303a, 0x1001)

        transport.connect()

        assertEquals(1, radio.closes)
        assertEquals(2, radio.opens)
        transport.disconnect()
    }
}
