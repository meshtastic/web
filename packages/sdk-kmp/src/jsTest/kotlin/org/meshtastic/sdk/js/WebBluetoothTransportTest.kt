package org.meshtastic.sdk.js

import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.take
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.promise
import kotlinx.coroutines.withTimeout
import org.khronos.webgl.Uint8Array
import org.meshtastic.sdk.Frame
import org.meshtastic.sdk.TransportState
import kotlin.js.Promise
import kotlin.test.AfterTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

/**
 * Drives the transport with a scripted `navigator.bluetooth`. The fake device
 * queues `fromradio` reads and records `toradio` writes; `requestDevice`
 * counts prompts, which must stay at zero.
 */
class WebBluetoothTransportTest {
    @AfterTest
    fun restore() {
        js("delete globalThis.navigator")
    }

    private fun installBluetooth(devices: Array<dynamic>): dynamic {
        val bluetooth = js(
            """({
                requested: 0,
                requestDevice: function () { this.requested++; return Promise.reject(new Error('prompted')); }
            })""",
        )
        bluetooth.devices = devices
        bluetooth.getDevices = { Promise.resolve<dynamic>(bluetooth.devices) }
        val navigator = js("({})")
        navigator.bluetooth = bluetooth
        js("Object.defineProperty(globalThis, 'navigator', { value: navigator, configurable: true, writable: true })")
        return bluetooth
    }

    private fun fakeDevice(id: String, hasService: Boolean = true, gattMillis: Int = 0): dynamic {
        val device = js(
            """({
                listeners: {}, queued: [], written: [], connects: 0, notifying: false, busy: 0, overlaps: 0,
                gatt_: function (work) {
                    var self = this;
                    if (self.busy > 0) self.overlaps++;
                    self.busy++;
                    return new Promise(function (resolve) {
                        setTimeout(function () { self.busy--; resolve(work()); }, self.gattMillis);
                    });
                },
                addEventListener: function (type, cb) { (this.listeners[type] = this.listeners[type] || []).push(cb); },
                removeEventListener: function () {},
                dispatch: function (type) { (this.listeners[type] || []).forEach(function (cb) { cb({}); }); },
                queue: function (bytes) { this.queued.push(bytes); }
            })""",
        )
        device.id = id
        device.gattMillis = gattMillis
        val chars = js("({})")
        chars.fromradio = js(
            """({ readValue: function () { return device.gatt_(function () { var next = device.queued.shift(); return new DataView(next ? next.buffer : new ArrayBuffer(0)); }); } })""",
        )
        chars.toradio = js(
            """({ writeValueWithResponse: function (buffer) { return device.gatt_(function () { device.written.push(new Uint8Array(buffer)); }); } })""",
        )
        chars.fromnum = js(
            """({
                addEventListener: function (type, cb) { device.listeners[type] = (device.listeners[type] || []).concat([cb]); },
                removeEventListener: function () {},
                startNotifications: function () { device.notifying = true; return Promise.resolve(); },
                stopNotifications: function () { device.notifying = false; }
            })""",
        )
        val service = js("({})")
        service.getCharacteristic = { uuid: String ->
            Promise.resolve<dynamic>(
                when (uuid) {
                    "f75c76d2-129e-4dad-a1dd-7866124401e7" -> chars.toradio
                    "2c55e69e-4993-11ed-b878-0242ac120002" -> chars.fromradio
                    else -> chars.fromnum
                },
            )
        }
        val server = js("({ connected: false })")
        server.device = device
        server.getPrimaryService = { _: String ->
            if (hasService) Promise.resolve<dynamic>(service) else Promise.reject(Exception("no service"))
        }
        server.disconnect = { server.connected = false }
        val gatt = js("({})")
        gatt.connect = {
            device.connects = (device.connects as Int) + 1
            server.connected = true
            Promise.resolve<dynamic>(server)
        }
        device.gatt = gatt
        return device
    }

    @Test
    fun reconnects_a_known_device_through_getDevices_without_prompting() = GlobalScope.promise {
        val radio = fakeDevice("radio-1")
        val bluetooth = installBluetooth(arrayOf(fakeDevice("other"), radio))
        val transport = WebBluetoothTransport(null, "radio-1")

        transport.connect()

        assertEquals(TransportState.Connected, transport.state.value)
        assertEquals(1, radio.connects)
        assertTrue(radio.notifying as Boolean)
        assertEquals(0, bluetooth.requested)
        assertEquals("ble:radio-1", transport.identity.raw)
        transport.disconnect()
        assertEquals(TransportState.Disconnected, transport.state.value)
    }

    @Test
    fun uses_the_device_a_gesture_handed_over() = GlobalScope.promise {
        val radio = fakeDevice("radio-1")
        val bluetooth = installBluetooth(arrayOf())
        val transport = WebBluetoothTransport(radio, null)

        transport.connect()

        assertEquals(1, radio.connects)
        assertEquals(0, bluetooth.requested)
        transport.disconnect()
    }

    @Test
    fun fails_without_prompting_when_the_device_is_not_permitted() = GlobalScope.promise {
        val bluetooth = installBluetooth(arrayOf(fakeDevice("other")))

        val failure = assertFailsWith<ClientException> { WebBluetoothTransport(null, "radio-1").connect() }

        assertEquals("bluetooth-unavailable", failure.kind)
        assertEquals(0, bluetooth.requested)
    }

    @Test
    fun reports_a_missing_api_clearly() = GlobalScope.promise {
        js("Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true, writable: true })")

        val failure = assertFailsWith<ClientException> { WebBluetoothTransport(null, "radio-1").connect() }

        assertEquals("bluetooth-unsupported", failure.kind)
    }

    @Test
    fun reports_a_device_without_the_meshtastic_service() = GlobalScope.promise {
        installBluetooth(arrayOf(fakeDevice("radio-1", hasService = false)))

        val failure = assertFailsWith<ClientException> { WebBluetoothTransport(null, "radio-1").connect() }

        assertEquals("bluetooth-missing-service", failure.kind)
    }

    @Test
    fun drains_fromradio_on_fromnum_and_frames_each_read() = GlobalScope.promise {
        val radio = fakeDevice("radio-1")
        installBluetooth(arrayOf(radio))
        val transport = WebBluetoothTransport(null, "radio-1")
        transport.connect()

        val first = byteArrayOf(0x08, 0x01)
        val second = byteArrayOf(0x08, 0x02, 0x03)
        radio.queue(first.toUint8Array())
        radio.queue(second.toUint8Array())
        radio.dispatch("characteristicvaluechanged")

        val frames = withTimeout(1_000) { transport.frames().take(2).toList() }
        assertEquals(listOf(Frame(framed(first)), Frame(framed(second))), frames)
        transport.disconnect()
    }

    @Test
    fun sends_the_payload_without_the_stream_header() = GlobalScope.promise {
        val radio = fakeDevice("radio-1")
        installBluetooth(arrayOf(radio))
        val transport = WebBluetoothTransport(null, "radio-1")
        transport.connect()

        transport.send(Frame(framed(byteArrayOf(0x10, 0x20))))

        assertEquals(1, radio.written.length as Int)
        assertEquals(listOf<Byte>(0x10, 0x20), (radio.written[0] as Uint8Array).toByteArray().toList())
        transport.disconnect()
    }

    @Test
    fun a_send_during_a_drain_waits_for_the_read_in_flight() = GlobalScope.promise {
        val radio = fakeDevice("radio-1", gattMillis = 20)
        installBluetooth(arrayOf(radio))
        val transport = WebBluetoothTransport(null, "radio-1")
        transport.connect()

        radio.queue(byteArrayOf(0x08, 0x01).toUint8Array())
        radio.dispatch("characteristicvaluechanged")
        transport.send(Frame(framed(byteArrayOf(0x10))))
        withTimeout(1_000) { transport.frames().first() }

        assertEquals(1, radio.written.length as Int)
        assertEquals(0, radio.overlaps as Int)
        transport.disconnect()
    }

    @Test
    fun frames_queued_by_the_old_link_do_not_reach_the_next_connect() = GlobalScope.promise {
        val radio = fakeDevice("radio-1")
        installBluetooth(arrayOf(radio))
        val transport = WebBluetoothTransport(null, "radio-1")
        transport.connect()
        radio.queue(byteArrayOf(0x08, 0x01).toUint8Array())
        radio.dispatch("characteristicvaluechanged")
        delay(50)

        transport.disconnect()
        transport.connect()

        assertEquals(null, withTimeoutOrNull(100) { transport.frames().first() })
        transport.disconnect()
    }

    @Test
    fun a_gatt_disconnect_is_a_recoverable_error_and_the_same_device_reconnects() = GlobalScope.promise {
        val radio = fakeDevice("radio-1")
        val bluetooth = installBluetooth(arrayOf(radio))
        val transport = WebBluetoothTransport(null, "radio-1")
        transport.connect()

        radio.dispatch("gattserverdisconnected")
        val error = withTimeout(1_000) { transport.state.first { it is TransportState.Error } } as TransportState.Error
        assertTrue(error.recoverable)
        assertEquals("bluetooth-disconnected", (error.cause as ClientException).kind)

        transport.disconnect()
        transport.connect()

        assertEquals(TransportState.Connected, transport.state.value)
        assertEquals(2, radio.connects)
        assertEquals(0, bluetooth.requested)
        transport.disconnect()
    }
}
