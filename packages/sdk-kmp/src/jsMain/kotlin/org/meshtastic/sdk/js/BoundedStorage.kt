package org.meshtastic.sdk.js

import kotlinx.coroutines.withTimeoutOrNull
import org.meshtastic.proto.Channel
import org.meshtastic.proto.NodeInfo
import org.meshtastic.sdk.ConfigBundle
import org.meshtastic.sdk.DeviceStorage
import org.meshtastic.sdk.InMemoryStorageProvider
import org.meshtastic.sdk.NodeId
import org.meshtastic.sdk.SessionPasskey
import org.meshtastic.sdk.StorageProvider
import org.meshtastic.sdk.TransportIdentity

/**
 * Wraps [inner] so a storage backend that hangs or fails can never stall the client: activation that
 * does not finish within [timeoutMs] falls back to [fallback], and the first call on an activated
 * store that times out or throws switches that store to answering immediately with empty results.
 */
internal class BoundedStorageProvider(
    private val inner: StorageProvider,
    private val timeoutMs: Long,
    private val fallback: StorageProvider = InMemoryStorageProvider(),
    private val log: (String) -> Unit,
) : StorageProvider {
    override suspend fun activate(identity: TransportIdentity): DeviceStorage {
        val activated = withTimeoutOrNull(timeoutMs) { runCatching { inner.activate(identity) } }?.getOrNull()
        if (activated != null) return BoundedDeviceStorage(activated, timeoutMs, log)
        log("Storage did not activate within ${timeoutMs}ms; continuing in memory")
        return fallback.activate(identity)
    }
}

private class BoundedDeviceStorage(
    private val inner: DeviceStorage,
    private val timeoutMs: Long,
    private val log: (String) -> Unit,
) : DeviceStorage {
    private var degraded = false

    private suspend fun <T> bounded(default: T, block: suspend () -> T): T {
        if (degraded) return default
        val result = withTimeoutOrNull(timeoutMs) { runCatching { block() } }
        if (result == null || result.isFailure) {
            degraded = true
            log("Storage stopped responding (${result?.exceptionOrNull()?.message ?: "timed out"}); continuing without it")
            return default
        }
        return result.getOrThrow()
    }

    override suspend fun loadNodes(): Map<NodeId, NodeInfo> = bounded(emptyMap()) { inner.loadNodes() }

    override suspend fun saveNode(node: NodeInfo) = bounded(Unit) { inner.saveNode(node) }

    override suspend fun removeNode(nodeId: NodeId) = bounded(Unit) { inner.removeNode(nodeId) }

    override suspend fun loadConfig(): ConfigBundle? = bounded(null) { inner.loadConfig() }

    override suspend fun saveConfig(config: ConfigBundle) = bounded(Unit) { inner.saveConfig(config) }

    override suspend fun loadChannels(): List<Channel> = bounded(emptyList()) { inner.loadChannels() }

    override suspend fun saveChannels(channels: List<Channel>) = bounded(Unit) { inner.saveChannels(channels) }

    override suspend fun recordOwnNode(nodeNum: NodeId, firmwareVersion: String) =
        bounded(Unit) { inner.recordOwnNode(nodeNum, firmwareVersion) }

    override suspend fun clear() = bounded(Unit) { inner.clear() }

    override fun close() {
        runCatching { inner.close() }
    }

    override suspend fun saveSessionPasskey(passkey: SessionPasskey) =
        bounded(Unit) { inner.saveSessionPasskey(passkey) }

    override suspend fun loadSessionPasskey(): SessionPasskey? = bounded(null) { inner.loadSessionPasskey() }

    override suspend fun saveHeartbeat(nodeId: NodeId, epochMillis: Long) =
        bounded(Unit) { inner.saveHeartbeat(nodeId, epochMillis) }

    override suspend fun loadHeartbeats(): Map<NodeId, Long> = bounded(emptyMap()) { inner.loadHeartbeats() }
}
