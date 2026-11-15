@file:OptIn(ExperimentalJsExport::class)

package org.meshtastic.sdk.js

import kotlinx.coroutines.await
import okio.ByteString.Companion.toByteString
import org.khronos.webgl.Uint8Array
import org.meshtastic.proto.Channel
import org.meshtastic.proto.NodeInfo
import org.meshtastic.sdk.ConfigBundle
import org.meshtastic.sdk.DeviceStorage
import org.meshtastic.sdk.NodeId
import org.meshtastic.sdk.SessionPasskey
import org.meshtastic.sdk.StorageProvider
import org.meshtastic.sdk.TransportIdentity
import kotlin.js.ExperimentalJsExport
import kotlin.js.JsExport
import kotlin.js.Promise

/** A host-implemented store the SDK opens before connecting; see the SDK's `StorageProvider`. */
@JsExport
external interface StorageJs {
    fun activate(identity: String): Promise<DeviceStorageJs>
}

@JsExport
external interface HeartbeatJs {
    val nodeNum: Int
    val epochMillis: Double
}

@JsExport
external interface PasskeyJs {
    val bytes: Uint8Array
    val expiresAtEpochMs: Double
}

/**
 * One device's persisted state, as the SDK's `DeviceStorage`. Protobufs
 * cross as encoded bytes; `loadConfig` and `loadSessionPasskey` resolve to
 * null when nothing is stored.
 */
@JsExport
external interface DeviceStorageJs {
    fun loadNodes(): Promise<Array<Uint8Array>>
    fun saveNode(nodeInfo: Uint8Array): Promise<Unit>
    fun removeNode(nodeNum: Int): Promise<Unit>
    fun loadConfig(): Promise<ConfigBundleJs?>
    fun saveConfig(bundle: ConfigBundleJs): Promise<Unit>
    fun loadChannels(): Promise<Array<Uint8Array>>
    fun saveChannels(channels: Array<Uint8Array>): Promise<Unit>
    fun recordOwnNode(nodeNum: Int, firmwareVersion: String): Promise<Unit>
    fun clear(): Promise<Unit>
    fun close()
    fun saveSessionPasskey(passkey: PasskeyJs): Promise<Unit>
    fun loadSessionPasskey(): Promise<PasskeyJs?>
    fun saveHeartbeat(nodeNum: Int, epochMillis: Double): Promise<Unit>
    fun loadHeartbeats(): Promise<Array<HeartbeatJs>>
}

internal class JsStorageProvider(private val js: StorageJs) : StorageProvider {
    override suspend fun activate(identity: TransportIdentity): DeviceStorage =
        JsDeviceStorage(js.activate(identity.raw).await())
}

internal class JsDeviceStorage(private val js: DeviceStorageJs) : DeviceStorage {
    override suspend fun loadNodes(): Map<NodeId, NodeInfo> =
        js.loadNodes().await().map { NodeInfo.ADAPTER.decode(it.toByteArray()) }.associateBy { NodeId(it.num) }

    override suspend fun saveNode(node: NodeInfo) {
        js.saveNode(node.encodeJs()).await()
    }

    override suspend fun removeNode(nodeId: NodeId) {
        js.removeNode(nodeId.raw).await()
    }

    override suspend fun loadConfig(): ConfigBundle? = js.loadConfig().await()?.toKotlin()

    override suspend fun saveConfig(config: ConfigBundle) {
        js.saveConfig(config.toJs()).await()
    }

    override suspend fun loadChannels(): List<Channel> =
        js.loadChannels().await().map { Channel.ADAPTER.decode(it.toByteArray()) }

    override suspend fun saveChannels(channels: List<Channel>) {
        js.saveChannels(channels.toJs()).await()
    }

    override suspend fun recordOwnNode(nodeNum: NodeId, firmwareVersion: String) {
        js.recordOwnNode(nodeNum.raw, firmwareVersion).await()
    }

    override suspend fun clear() {
        js.clear().await()
    }

    override fun close() {
        js.close()
    }

    override suspend fun saveSessionPasskey(passkey: SessionPasskey) {
        val value = jso<dynamic>()
        value.bytes = passkey.bytes.toUint8Array()
        value.expiresAtEpochMs = passkey.expiresAtEpochMs.toDouble()
        js.saveSessionPasskey(value.unsafeCast<PasskeyJs>()).await()
    }

    override suspend fun loadSessionPasskey(): SessionPasskey? = js.loadSessionPasskey().await()?.let {
        SessionPasskey(it.bytes.toByteArray().toByteString(), it.expiresAtEpochMs.toLong())
    }

    override suspend fun saveHeartbeat(nodeId: NodeId, epochMillis: Long) {
        js.saveHeartbeat(nodeId.raw, epochMillis.toDouble()).await()
    }

    override suspend fun loadHeartbeats(): Map<NodeId, Long> =
        js.loadHeartbeats().await().associate { NodeId(it.nodeNum) to it.epochMillis.toLong() }
}
