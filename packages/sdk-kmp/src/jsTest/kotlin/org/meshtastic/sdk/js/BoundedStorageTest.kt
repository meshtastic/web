package org.meshtastic.sdk.js

import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.test.currentTime
import kotlinx.coroutines.test.runTest
import okio.ByteString.Companion.encodeUtf8
import org.meshtastic.proto.Channel
import org.meshtastic.proto.DeviceMetadata
import org.meshtastic.proto.MyNodeInfo
import org.meshtastic.proto.NodeInfo
import org.meshtastic.sdk.ConfigBundle
import org.meshtastic.sdk.DeviceStorage
import org.meshtastic.sdk.NodeId
import org.meshtastic.sdk.SessionPasskey
import org.meshtastic.sdk.StorageProvider
import org.meshtastic.sdk.TransportIdentity
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

private class FakeDeviceStorage : DeviceStorage {
    var hangLoadNodes = false
    var failSaveConfig = false
    val calls = mutableListOf<String>()

    override suspend fun loadNodes(): Map<NodeId, NodeInfo> {
        calls += "loadNodes"
        if (hangLoadNodes) awaitCancellation()
        return mapOf(NodeId(1) to node(1))
    }

    override suspend fun saveNode(node: NodeInfo) {
        calls += "saveNode:${node.num}"
    }

    override suspend fun removeNode(nodeId: NodeId) {
        calls += "removeNode:${nodeId.raw}"
    }

    override suspend fun loadConfig(): ConfigBundle? {
        calls += "loadConfig"
        return null
    }

    override suspend fun saveConfig(config: ConfigBundle) {
        calls += "saveConfig"
        if (failSaveConfig) error("boom")
    }

    override suspend fun loadChannels(): List<Channel> {
        calls += "loadChannels"
        return listOf(channel(2))
    }

    override suspend fun saveChannels(channels: List<Channel>) {
        calls += "saveChannels:${channels.size}"
    }

    override suspend fun recordOwnNode(nodeNum: NodeId, firmwareVersion: String) {
        calls += "recordOwnNode:${nodeNum.raw}:$firmwareVersion"
    }

    override suspend fun clear() {
        calls += "clear"
    }

    override fun close() {
        calls += "close"
    }

    override suspend fun saveSessionPasskey(passkey: SessionPasskey) {
        calls += "saveSessionPasskey"
    }

    override suspend fun loadSessionPasskey(): SessionPasskey? {
        calls += "loadSessionPasskey"
        return SessionPasskey("k".encodeUtf8(), 9)
    }

    override suspend fun saveHeartbeat(nodeId: NodeId, epochMillis: Long) {
        calls += "saveHeartbeat:${nodeId.raw}:$epochMillis"
    }

    override suspend fun loadHeartbeats(): Map<NodeId, Long> {
        calls += "loadHeartbeats"
        return mapOf(NodeId(1) to 5L)
    }
}

private class FakeProvider(val storage: FakeDeviceStorage? = null) : StorageProvider {
    override suspend fun activate(identity: TransportIdentity): DeviceStorage = storage ?: awaitCancellation()
}

private fun node(num: Int) = NodeInfo.Builder().also { it.num = num }.build()

private fun channel(index: Int) = Channel.Builder().also { it.index = index }.build()

private val identity = TransportIdentity("test")

class BoundedStorageTest {
    private val warnings = mutableListOf<String>()

    private fun bounded(inner: StorageProvider) = BoundedStorageProvider(inner, 5000, log = { warnings += it })

    @Test
    fun activateThatNeverAnswersFallsBackToMemory() = runTest {
        val storage = bounded(FakeProvider()).activate(identity)
        assertEquals(5000, currentTime)
        val node = node(7)
        storage.saveNode(node)
        assertEquals(mapOf(NodeId(7) to node), storage.loadNodes())
        assertEquals(1, warnings.size)
    }

    @Test
    fun hungReadDegradesOnceThenAnswersImmediately() = runTest {
        val inner = FakeDeviceStorage().apply { hangLoadNodes = true }
        val storage = bounded(FakeProvider(inner)).activate(identity)
        assertEquals(emptyMap<NodeId, NodeInfo>(), storage.loadNodes())
        assertEquals(5000, currentTime)
        assertEquals(emptyMap<NodeId, NodeInfo>(), storage.loadNodes())
        assertEquals(5000, currentTime)
        storage.saveNode(node(3))
        assertEquals(listOf("loadNodes"), inner.calls)
        assertEquals(1, warnings.size)
    }

    @Test
    fun failingWriteCountsAsDone() = runTest {
        val inner = FakeDeviceStorage().apply { failSaveConfig = true }
        val storage = bounded(FakeProvider(inner)).activate(identity)
        storage.saveConfig(
            ConfigBundle(
                MyNodeInfo.Builder().build(),
                DeviceMetadata.Builder().build(),
                emptyList(),
                emptyList(),
            ),
        )
        assertNull(storage.loadConfig())
        assertEquals(listOf("saveConfig"), inner.calls)
        assertEquals(1, warnings.size)
    }

    @Test
    fun healthyStoragePassesThrough() = runTest {
        val inner = FakeDeviceStorage()
        val storage = bounded(FakeProvider(inner)).activate(identity)
        val node = node(1)
        val bundle = ConfigBundle(
            MyNodeInfo.Builder().build(),
            DeviceMetadata.Builder().build(),
            emptyList(),
            emptyList(),
        )
        assertEquals(mapOf(NodeId(1) to node), storage.loadNodes())
        storage.saveNode(node)
        storage.removeNode(NodeId(1))
        assertNull(storage.loadConfig())
        storage.saveConfig(bundle)
        assertEquals(listOf(channel(2)), storage.loadChannels())
        storage.saveChannels(listOf(channel(0)))
        storage.recordOwnNode(NodeId(1), "2.5")
        storage.clear()
        storage.saveSessionPasskey(SessionPasskey("k".encodeUtf8(), 9))
        assertEquals(SessionPasskey("k".encodeUtf8(), 9), storage.loadSessionPasskey())
        storage.saveHeartbeat(NodeId(1), 5)
        assertEquals(mapOf(NodeId(1) to 5L), storage.loadHeartbeats())
        storage.close()
        assertEquals(
            listOf(
                "loadNodes", "saveNode:1", "removeNode:1", "loadConfig", "saveConfig", "loadChannels",
                "saveChannels:1", "recordOwnNode:1:2.5", "clear", "saveSessionPasskey", "loadSessionPasskey",
                "saveHeartbeat:1:5", "loadHeartbeats", "close",
            ),
            inner.calls,
        )
        assertEquals(0, warnings.size)
    }

    @Test
    fun closeDelegatesWhenDegraded() = runTest {
        val inner = FakeDeviceStorage().apply { hangLoadNodes = true }
        val storage = bounded(FakeProvider(inner)).activate(identity)
        storage.loadNodes()
        storage.close()
        assertEquals(listOf("loadNodes", "close"), inner.calls)
    }
}
