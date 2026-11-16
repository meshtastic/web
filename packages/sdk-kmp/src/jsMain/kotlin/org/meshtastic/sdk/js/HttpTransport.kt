package org.meshtastic.sdk.js

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.await
import kotlinx.coroutines.cancel
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import org.khronos.webgl.ArrayBuffer
import org.khronos.webgl.Uint8Array
import org.meshtastic.sdk.Frame
import org.meshtastic.sdk.RadioTransport
import org.meshtastic.sdk.TransportIdentity
import org.meshtastic.sdk.TransportState
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
    private val wake = Channel<Unit>(Channel.CONFLATED)
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
                        val cause = Lna.classify(baseUrl, e)
                        _state.value = TransportState.Error(cause, recoverable = cause.kind() != Lna.DENIED)
                        return@launch
                    }
                    withTimeoutOrNull(pollMillis) { wake.receive() }
                }
            }
        }
    }

    private suspend fun drain() {
        while (true) {
            val response = request("$baseUrl/api/v1/fromradio?all=true", "GET")
            val buffer = (response.arrayBuffer() as Promise<ArrayBuffer>).await()
            if (buffer.byteLength == 0) return
            for (payload in splitFromRadio(Uint8Array(buffer).toByteArray())) {
                inbound.trySend(Frame(framed(payload)))
            }
        }
    }

    override suspend fun disconnect() {
        scope?.cancel()
        scope = null
        discardQueued()
        _state.value = TransportState.Disconnected
    }

    override suspend fun send(frame: Frame) {
        val init = Lna.requestInit(baseUrl, "PUT")
        init.body = payloadOf(frame).toUint8Array()
        val response = fetch("$baseUrl/api/v1/toradio", init).await()
        if (response.ok != true) throw ClientException("transport", "toradio ${response.status}")
        wake.trySend(Unit)
    }

    override fun frames(): Flow<Frame> = inbound.receiveAsFlow()

    /** Frames the old link queued after the engine stopped reading must not reach the next handshake. */
    private fun discardQueued() {
        while (inbound.tryReceive().isSuccess) {
        }
    }

    private suspend fun request(url: String, method: String): dynamic {
        val response = fetch(url, Lna.requestInit(baseUrl, method)).await()
        if (response.ok != true) throw ClientException("transport", "$method ${response.status}")
        return response
    }
}
