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
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import okio.ByteString.Companion.toByteString
import org.khronos.webgl.ArrayBuffer
import org.khronos.webgl.Uint8Array
import org.meshtastic.sdk.Frame
import org.meshtastic.sdk.RadioTransport
import org.meshtastic.sdk.TransportIdentity
import org.meshtastic.sdk.TransportState
import org.meshtastic.sdk.WireFraming
import kotlin.js.Promise

internal class HttpTransport(
    private val baseUrl: String,
    private var allowPrompt: Boolean,
    private val pollMillis: Long = 3_000,
) : RadioTransport {
    override val identity: TransportIdentity = TransportIdentity("http:${baseUrl.lowercase()}")
    private val _state = MutableStateFlow<TransportState>(TransportState.Disconnected)
    override val state: StateFlow<TransportState> = _state.asStateFlow()
    private val inbound = Channel<Frame>(Channel.UNLIMITED)
    private var scope: CoroutineScope? = null

    override suspend fun connect() {
        _state.value = TransportState.Connecting
        try {
            Lna.check(baseUrl, allowPrompt)
            request("$baseUrl/api/v1/toradio", "OPTIONS")
        } catch (e: CancellationException) {
            throw e
        } catch (e: Throwable) {
            _state.value = TransportState.Disconnected
            throw Lna.classify(baseUrl, e)
        } finally {
            allowPrompt = false
        }
        _state.value = TransportState.Connected
        scope = CoroutineScope(SupervisorJob()).also { s ->
            s.launch {
                while (isActive) {
                    try {
                        drain()
                    } catch (e: CancellationException) {
                        throw e
                    } catch (e: Throwable) {
                        _state.value = TransportState.Error(Lna.classify(baseUrl, e), recoverable = true)
                        return@launch
                    }
                    delay(pollMillis)
                }
            }
        }
    }

    private suspend fun drain() {
        while (true) {
            val response = request("$baseUrl/api/v1/fromradio?all=false", "GET")
            val buffer = (response.arrayBuffer() as Promise<ArrayBuffer>).await()
            if (buffer.byteLength == 0) return
            inbound.trySend(Frame(WireFraming.frame(Uint8Array(buffer).toByteArray())))
        }
    }

    override suspend fun disconnect() {
        scope?.cancel()
        scope = null
        _state.value = TransportState.Disconnected
    }

    override suspend fun send(frame: Frame) {
        val init = Lna.requestInit(baseUrl, "PUT")
        init.body = WireFraming.payload(frame.bytes.toByteArray()).toUint8Array()
        val response = fetch("$baseUrl/api/v1/toradio", init).await()
        if (response.ok != true) throw ClientException("transport", "toradio ${response.status}")
    }

    override fun frames(): Flow<Frame> = inbound.receiveAsFlow()

    private suspend fun request(url: String, method: String): dynamic {
        val response = fetch(url, Lna.requestInit(baseUrl, method)).await()
        if (response.ok != true) throw ClientException("transport", "$method ${response.status}")
        return response
    }
}

private fun WireFraming.frame(payload: ByteArray): okio.ByteString {
    val framed = ByteArray(HEADER_SIZE + payload.size)
    framed[0] = MAGIC_0
    framed[1] = MAGIC_1
    framed[2] = (payload.size shr 8).toByte()
    framed[3] = (payload.size and 0xFF).toByte()
    payload.copyInto(framed, HEADER_SIZE)
    return framed.toByteString()
}

private fun WireFraming.payload(framed: ByteArray): ByteArray = framed.copyOfRange(HEADER_SIZE, framed.size)
