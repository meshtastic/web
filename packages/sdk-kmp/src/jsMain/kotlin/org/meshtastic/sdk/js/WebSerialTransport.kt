package org.meshtastic.sdk.js

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.await
import kotlinx.coroutines.cancel
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import org.khronos.webgl.Uint8Array
import org.meshtastic.sdk.Frame
import org.meshtastic.sdk.RadioTransport
import org.meshtastic.sdk.TransportIdentity
import org.meshtastic.sdk.TransportState
import kotlin.js.Promise

/**
 * Web Serial as an SDK transport. Never prompts: `port` is a `SerialPort`
 * the host obtained from `navigator.serial.requestPort()` inside a user
 * gesture, or null, in which case every connect (first or reconnect) reopens
 * the one permitted port whose USB ids match through `getPorts()`.
 *
 * A lost link is reported through [state] as a recoverable
 * [TransportState.Error] and never thrown from [send]: the engine treats a
 * throwing send as fatal and tears the session down instead of reconnecting.
 */
internal class WebSerialTransport(
    private var port: dynamic,
    private val usbVendorId: Int?,
    private val usbProductId: Int?,
    private val baudRate: Int = 115_200,
) : RadioTransport {
    override val identity: TransportIdentity =
        TransportIdentity("serial:${usbVendorId?.toString(16) ?: "?"}:${usbProductId?.toString(16) ?: "?"}")
    private val _state = MutableStateFlow<TransportState>(TransportState.Disconnected)
    override val state: StateFlow<TransportState> = _state.asStateFlow()
    private val inbound = Channel<Frame>(Channel.UNLIMITED)
    private var scope: CoroutineScope? = null
    private var reader: dynamic = null
    private var writer: dynamic = null
    private var closing = false
    private var listening = false

    private val onOsDisconnect: (dynamic) -> Unit = { event ->
        val gone = event.target ?: event.port
        if (gone != null && gone === port) {
            dropped("Serial device disconnected")
            port = null
        }
    }

    private val onOsConnect: (dynamic) -> Unit = { event ->
        val found = event.target ?: event.port
        if (port == null && found != null && matches(found)) port = found
    }

    override suspend fun connect() {
        _state.value = TransportState.Connecting
        closing = false
        val opened: dynamic
        try {
            val serial = serialApi() ?: throw ClientException(UNSUPPORTED, "Web Serial is not supported in this browser")
            opened = port ?: findPort(serial) ?: throw ClientException(
                UNAVAILABLE,
                "Serial port not available. Re-select the port.",
            )
            port = opened
            open(opened)
            discardStale(opened)
            if (!listening) {
                serial.addEventListener("disconnect", onOsDisconnect)
                serial.addEventListener("connect", onOsConnect)
                listening = true
            }
        } catch (e: Throwable) {
            stopListening()
            _state.value = TransportState.Disconnected
            throw e
        }
        _state.value = TransportState.Connected
        scope = CoroutineScope(SupervisorJob()).also { s -> s.launch { readLoop(opened) } }
    }

    override suspend fun disconnect() {
        closing = true
        scope?.cancel()
        scope = null
        stopListening()
        release()
        discardQueued()
        _state.value = TransportState.Disconnected
    }

    private fun stopListening() {
        if (!listening) return
        listening = false
        val serial = serialApi() ?: return
        serial.removeEventListener("disconnect", onOsDisconnect)
        serial.removeEventListener("connect", onOsConnect)
    }

    override suspend fun send(frame: Frame) {
        val w = writer ?: throw ClientException("transport", "Serial port is not open")
        try {
            (w.write(frame.bytes.toByteArray().toUint8Array()) as Promise<Unit>).await()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Throwable) {
            dropped(e.message ?: "Serial write failed")
        }
    }

    override fun frames(): Flow<Frame> = inbound.receiveAsFlow()

    /** Frames the old link queued after the engine stopped reading must not reach the next handshake. */
    private fun discardQueued() {
        while (inbound.tryReceive().isSuccess) {
        }
    }

    private fun matches(candidate: dynamic): Boolean {
        if (usbVendorId == null || usbProductId == null) return false
        val info = try {
            candidate.getInfo()
        } catch (_: Throwable) {
            return false
        }
        return info != null && info.usbVendorId == usbVendorId && info.usbProductId == usbProductId
    }

    private suspend fun findPort(serial: dynamic): dynamic {
        val ports = (serial.getPorts() as Promise<Array<dynamic>>).await()
        val matching = ports.filter { matches(it) }
        return if (matching.size == 1) matching[0] else null
    }

    private suspend fun open(p: dynamic) {
        if (p.readable != null || p.writable != null) {
            try {
                (p.close() as Promise<Unit>).await()
            } catch (e: Throwable) {
                throw ClientException(
                    BUSY,
                    "Serial port is open and could not be released. Close any other tab, terminal, or app using it and try again.",
                )
            }
            delay(POST_CLOSE_DELAY_MS)
        }
        val options = jso<dynamic>()
        options.baudRate = baudRate
        options.bufferSize = READ_BUFFER_SIZE
        var attempt = 0
        while (true) {
            try {
                (p.open(options) as Promise<Unit>).await()
                break
            } catch (e: Throwable) {
                val busy = isBusy(e)
                if (!busy || attempt == OPEN_RETRY_DELAYS_MS.size) {
                    throw ClientException(
                        if (busy) BUSY else UNAVAILABLE,
                        if (busy) {
                            "Serial port is busy. Another tab, terminal, or app is holding it. Close it and try again."
                        } else {
                            "Could not open the serial port. Re-plug the device and try again."
                        },
                    )
                }
                delay(OPEN_RETRY_DELAYS_MS[attempt])
                attempt++
            }
        }
        try {
            val signals = jso<dynamic>()
            signals.dataTerminalReady = true
            signals.requestToSend = true
            (p.setSignals(signals) as Promise<Unit>).await()
        } catch (_: Throwable) {
        }
        writer = p.writable.getWriter()
    }

    /**
     * Drops whatever the device had queued before the port opened (its log
     * text, the tail of an earlier frame), as the native transports purge
     * their input buffers, so the framer starts at a quiet boundary. Reads
     * until the line is silent for [DRAIN_QUIET_MS], or [DRAIN_MAX_MS] at most.
     */
    private suspend fun discardStale(p: dynamic) {
        val r = p.readable.getReader()
        try {
            withTimeoutOrNull(DRAIN_MAX_MS) {
                while (true) {
                    val result = withTimeoutOrNull(DRAIN_QUIET_MS) { (r.read() as Promise<dynamic>).await() } ?: break
                    if (result.done == true) break
                }
            }
        } finally {
            try {
                r.releaseLock()
            } catch (_: Throwable) {
            }
        }
    }

    private suspend fun readLoop(p: dynamic) {
        val assembler = FrameAssembler { inbound.trySend(it) }
        val r = p.readable.getReader()
        reader = r
        try {
            while (true) {
                val result = (r.read() as Promise<dynamic>).await()
                if (result.done == true) break
                assembler.feed((result.value as Uint8Array).toByteArray())
            }
            if (!closing) dropped("Serial port closed")
        } catch (e: CancellationException) {
            throw e
        } catch (e: Throwable) {
            if (!closing) dropped(e.message ?: "Serial read failed")
        }
    }

    private fun dropped(reason: String) {
        if (closing || _state.value !is TransportState.Connected) return
        _state.value = TransportState.Error(ClientException(DISCONNECTED, reason), recoverable = true)
        val p = port
        scope?.launch { release(p) }
    }

    private suspend fun release(p: dynamic = port) {
        try {
            (reader?.cancel() as? Promise<Unit>)?.await()
        } catch (_: Throwable) {
        }
        try {
            writer?.releaseLock()
        } catch (_: Throwable) {
        }
        reader = null
        writer = null
        if (p != null) {
            try {
                (p.close() as Promise<Unit>).await()
            } catch (_: Throwable) {
            }
        }
    }

    private companion object {
        const val UNSUPPORTED = "serial-unsupported"
        const val UNAVAILABLE = "serial-unavailable"
        const val BUSY = "serial-busy"
        const val DISCONNECTED = "serial-disconnected"
        const val READ_BUFFER_SIZE = 64 * 1024
        const val POST_CLOSE_DELAY_MS = 200L
        const val DRAIN_QUIET_MS = 50L
        const val DRAIN_MAX_MS = 300L
        val OPEN_RETRY_DELAYS_MS = longArrayOf(250, 500, 750)

        fun serialApi(): dynamic {
            val serial = js("globalThis.navigator ? globalThis.navigator.serial : undefined")
            return if (serial == null) null else serial
        }

        fun isBusy(e: Throwable): Boolean {
            val name = e.asDynamic().name
            if (name == "InvalidStateError") return true
            val message = e.message ?: return false
            return Regex("already open|failed to open serial port|access is denied", RegexOption.IGNORE_CASE)
                .containsMatchIn(message)
        }
    }
}
