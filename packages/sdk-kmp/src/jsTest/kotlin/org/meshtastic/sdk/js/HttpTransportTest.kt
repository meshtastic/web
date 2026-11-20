package org.meshtastic.sdk.js

import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.take
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.promise
import kotlinx.coroutines.withTimeout
import org.meshtastic.sdk.Frame
import org.meshtastic.sdk.TransportState
import kotlin.js.Promise
import kotlin.test.AfterTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * Drives the transport over a scripted `fetch` on an https page, with the
 * Local Network Access permission answered by a scripted `navigator`.
 */
class HttpTransportTest {
    @AfterTest
    fun restore() {
        js("delete globalThis.navigator; delete globalThis.window; delete globalThis.fetch; delete globalThis.isSecureContext")
    }

    private fun installPage(permission: () -> String) {
        val navigator = js("({ permissions: {} })")
        navigator.permissions.query = { _: dynamic ->
            val status = js("({})")
            status.state = permission()
            Promise.resolve<dynamic>(status)
        }
        js("Object.defineProperty(globalThis, 'navigator', { value: navigator, configurable: true, writable: true })")
        js("globalThis.window = { location: { protocol: 'https:' } }; globalThis.isSecureContext = true")
    }

    private fun installFetch(pollFails: Boolean) {
        val fetch: (String, dynamic) -> Promise<dynamic> = { url, init ->
            if (init.method == "GET" && pollFails) {
                Promise.reject(js("new TypeError('Failed to fetch')"))
            } else {
                val response = js("({ ok: true, status: 200 })")
                response.arrayBuffer = { Promise.resolve<dynamic>(js("new ArrayBuffer(0)")) }
                Promise.resolve<dynamic>(response)
            }
        }
        js("globalThis.fetch = fetch")
    }

    private class RecordingFetch(var bodies: List<ByteArray>) {
        val urls = mutableListOf<String>()
    }

    private fun installRecordingFetch(recording: RecordingFetch) {
        val fetch: (String, dynamic) -> Promise<dynamic> = { url, init ->
            if (init.method == "GET") recording.urls.add(url)
            val body = if (init.method == "GET" && recording.bodies.isNotEmpty()) {
                recording.bodies.first().also { recording.bodies = recording.bodies.drop(1) }
            } else {
                ByteArray(0)
            }
            val response = js("({ ok: true, status: 200 })")
            response.arrayBuffer = { Promise.resolve<dynamic>(body.toUint8Array().buffer) }
            Promise.resolve<dynamic>(response)
        }
        js("globalThis.fetch = fetch")
    }

    @Test
    fun one_poll_delivers_every_queued_message_as_its_own_frame() = GlobalScope.promise {
        installPage { "granted" }
        val myInfo = byteArrayOf(0x1A, 0x02, 0x08, 0x01)
        val configComplete = byteArrayOf(0x38, 0x05)
        val recording = RecordingFetch(listOf(myInfo + configComplete))
        installRecordingFetch(recording)
        val transport = HttpTransport("http://192.168.1.10", allowPrompt = false, pollMillis = 10)
        transport.connect()

        val frames = withTimeout(1_000) { transport.frames().take(2).toList() }
        transport.disconnect()

        assertEquals(listOf(Frame(framed(myInfo)), Frame(framed(configComplete))), frames)
        assertTrue(recording.urls.all { it.endsWith("/api/v1/fromradio?all=true") })
    }

    @Test
    fun a_send_polls_at_once_instead_of_waiting_for_the_next_interval() = GlobalScope.promise {
        installPage { "granted" }
        val recording = RecordingFetch(emptyList())
        installRecordingFetch(recording)
        val transport = HttpTransport("http://192.168.1.10", allowPrompt = false, pollMillis = 60_000)
        transport.connect()
        withTimeout(1_000) { while (recording.urls.isEmpty()) delay(5) }
        val polledBeforeSend = recording.urls.size
        recording.bodies = listOf(byteArrayOf(0x38, 0x05))

        transport.send(Frame(framed(byteArrayOf(0x18, 0x05))))
        val frame = withTimeout(1_000) { transport.frames().first() }
        transport.disconnect()

        assertEquals(Frame(framed(byteArrayOf(0x38, 0x05))), frame)
        assertTrue(recording.urls.size > polledBeforeSend)
    }

    private suspend fun pollErrorWith(permissionAfterFailure: String): TransportState.Error {
        var polled = false
        installPage { if (polled) permissionAfterFailure else "granted" }
        installFetch(pollFails = true)
        val transport = HttpTransport("http://192.168.1.10", allowPrompt = false, pollMillis = 10)
        transport.connect()
        polled = true
        val error = withTimeout(1_000) { transport.state.first { it is TransportState.Error } } as TransportState.Error
        transport.disconnect()
        return error
    }

    @Test
    fun a_poll_failure_with_the_permission_revoked_is_not_recoverable() = GlobalScope.promise {
        val error = pollErrorWith("denied")

        assertEquals(Lna.DENIED, error.cause.kind())
        assertFalse(error.recoverable)
    }

    @Test
    fun a_poll_failure_with_the_permission_granted_is_recoverable() = GlobalScope.promise {
        val error = pollErrorWith("granted")

        assertEquals("transport", error.cause.kind())
        assertTrue(error.recoverable)
    }
}
