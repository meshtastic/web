@file:OptIn(ExperimentalJsExport::class)

package org.meshtastic.sdk.js

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.promise
import org.khronos.webgl.Uint8Array
import org.meshtastic.proto.ToRadio
import org.meshtastic.sdk.AutoReconnectConfig
import org.meshtastic.sdk.InMemoryStorageProvider
import org.meshtastic.sdk.RadioClient
import org.meshtastic.sdk.RadioTransport
import kotlin.js.ExperimentalJsExport
import kotlin.js.JsExport
import kotlin.js.Promise

@JsExport
class MeshtasticClient internal constructor(transport: RadioTransport, private val maxAttempts: Int) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val frameListeners = mutableSetOf<(Uint8Array) -> Unit>()
    private val client: RadioClient = RadioClient {
        transport(TappingTransport(transport) { bytes -> frameListeners.toList().forEach { it(bytes.toUint8Array()) } })
        storage(InMemoryStorageProvider())
        autoReconnect(AutoReconnectConfig(maxAttempts = maxAttempts))
    }

    fun connect(): Promise<Unit> = scope.promise {
        try {
            client.connect()
        } catch (e: Throwable) {
            throw e.toJsError().unsafeCast<Throwable>()
        }
    }

    fun disconnect(): Promise<Unit> = scope.promise { client.disconnect() }

    val connectionState: ConnectionStateJs get() = client.connection.value.toJs(maxAttempts)

    val myNodeNum: Int? get() = client.ownNode.value?.num

    fun onConnectionState(cb: (ConnectionStateJs) -> Unit): () -> Unit {
        val job = client.connection.onEach { cb(it.toJs(maxAttempts)) }.launchIn(scope)
        return { job.cancel() }
    }

    fun onFromRadio(cb: (Uint8Array) -> Unit): () -> Unit {
        frameListeners.add(cb)
        return { frameListeners.remove(cb) }
    }

    fun sendRaw(toRadio: Uint8Array) {
        try {
            client.sendRaw(ToRadio.ADAPTER.decode(toRadio.toByteArray()))
        } catch (e: Throwable) {
            throw e.toJsError().unsafeCast<Throwable>()
        }
    }
}

@JsExport
fun createHttpClient(url: String, allowPrompt: Boolean = false, maxAttempts: Int = 10): MeshtasticClient =
    MeshtasticClient(HttpTransport(url.trimEnd('/'), allowPrompt), maxAttempts)
