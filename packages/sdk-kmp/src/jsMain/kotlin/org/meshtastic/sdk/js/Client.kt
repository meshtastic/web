@file:OptIn(ExperimentalJsExport::class)

package org.meshtastic.sdk.js

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.promise
import okio.ByteString
import org.khronos.webgl.Uint8Array
import org.meshtastic.proto.AirQualityMetrics
import org.meshtastic.proto.Data
import org.meshtastic.proto.DeviceMetrics
import org.meshtastic.proto.EnvironmentMetrics
import org.meshtastic.proto.HealthMetrics
import org.meshtastic.proto.HostMetrics
import org.meshtastic.proto.LocalStats
import org.meshtastic.proto.MeshPacket
import org.meshtastic.proto.PortNum
import org.meshtastic.proto.PowerMetrics
import org.meshtastic.proto.RouteDiscovery
import org.meshtastic.proto.Telemetry
import org.meshtastic.proto.TrafficManagementStats
import org.meshtastic.sdk.AutoReconnectConfig
import org.meshtastic.sdk.ChannelIndex
import org.meshtastic.sdk.InMemoryStorageProvider
import org.meshtastic.sdk.LogLevel
import org.meshtastic.sdk.MessageHandle
import org.meshtastic.sdk.NodeId
import org.meshtastic.sdk.RadioClient
import org.meshtastic.sdk.RadioTransport
import org.meshtastic.sdk.RoutingApi
import kotlin.js.ExperimentalJsExport
import kotlin.js.JsExport
import kotlin.js.Promise

@JsExport
class MeshtasticClient internal constructor(
    transport: RadioTransport,
    private val maxAttempts: Int,
    storage: StorageJs? = null,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val frameListeners = mutableSetOf<(Uint8Array) -> Unit>()
    private val client: RadioClient = RadioClient {
        transport(TappingTransport(transport) { bytes -> frameListeners.toList().forEach { it(bytes.toUint8Array()) } })
        storage(if (storage == null) InMemoryStorageProvider() else JsStorageProvider(storage))
        autoReconnect(AutoReconnectConfig(maxAttempts = maxAttempts))
        logger(JsLogSink)
    }

    init {
        client.connection
            .onEach { JsLogSink.log(LogLevel.INFO, "Client", "Connection state: ${it.describe()}", null) }
            .launchIn(scope)
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

    fun onConnectionState(cb: (ConnectionStateJs) -> Unit): () -> Unit =
        client.connection.onEach { cb(it.toJs(maxAttempts)) }.subscribe()

    fun onNodeChange(cb: (NodeChangeJs) -> Unit): () -> Unit =
        client.nodes.onEach { cb(it.toJs()) }.subscribe()

    /** Every decoded `MeshPacket` the device forwards, encoded. */
    fun onPacket(cb: (Uint8Array) -> Unit): () -> Unit =
        client.packets.onEach { cb(MeshPacket.ADAPTER.encode(it).toUint8Array()) }.subscribe()

    fun onTelemetry(nodeNum: Int, cb: (Uint8Array) -> Unit): () -> Unit =
        client.telemetry.observe(NodeId(nodeNum)).onEach { cb(Telemetry.ADAPTER.encode(it).toUint8Array()) }.subscribe()

    fun onFromRadio(cb: (Uint8Array) -> Unit): () -> Unit {
        frameListeners.add(cb)
        return { frameListeners.remove(cb) }
    }

    /** Admin messages for the local node, or for `dest` when given. */
    fun admin(dest: Int = 0): AdminJs =
        AdminJs(if (dest == 0) client.admin else client.admin.forNode(NodeId(dest)), scope)

    fun sendText(text: String, to: Int, channel: Int, replyId: Int = 0): SendHandleJs =
        sending { client.sendText(text, NodeId(to), ChannelIndex(channel), replyId) }

    /** Sends an encoded `MeshPacket`; the SDK assigns the id and reports the outcome. */
    fun sendPacket(meshPacket: Uint8Array): SendHandleJs =
        sending { client.send(MeshPacket.ADAPTER.decode(meshPacket.toByteArray())) }

    fun requestNodeInfo(nodeNum: Int): SendHandleJs = sending { client.requestNodeInfo(NodeId(nodeNum)) }

    fun requestPosition(nodeNum: Int): SendHandleJs = sending {
        client.send(
            MeshPacket.Builder().also { packet ->
                packet.to = nodeNum
                packet.want_ack = true
                packet.decoded = Data.Builder().also { data ->
                    data.portnum = PortNum.POSITION_APP
                    data.payload = ByteString.EMPTY
                    data.want_response = true
                }.build()
            }.build(),
        )
    }

    /** Trace the route to `dest`; `value` is the encoded `RouteDiscovery`. */
    fun traceRoute(dest: Int, hopLimit: Int = RoutingApi.DEFAULT_HOP_LIMIT): Promise<AdminResultJs> = scope.promise {
        client.routing.traceRoute(NodeId(dest), hopLimit).toJs { RouteDiscovery.ADAPTER.encode(it).toUint8Array() }
    }

    /**
     * Requests one telemetry `kind` (`device`, `environment`, `power`,
     * `airQuality`, `localStats`, `health`, `host`, `trafficManagement`)
     * from `nodeNum`; `value` is the encoded metrics message.
     */
    fun requestTelemetry(kind: String, nodeNum: Int = 0): Promise<AdminResultJs> = scope.promise {
        val node = NodeId(nodeNum)
        val telemetry = client.telemetry
        when (kind) {
            "device" -> telemetry.requestDevice(node).toJs { DeviceMetrics.ADAPTER.encode(it).toUint8Array() }
            "environment" -> telemetry.requestEnvironment(node).toJs { EnvironmentMetrics.ADAPTER.encode(it).toUint8Array() }
            "power" -> telemetry.requestPower(node).toJs { PowerMetrics.ADAPTER.encode(it).toUint8Array() }
            "airQuality" -> telemetry.requestAirQuality(node).toJs { AirQualityMetrics.ADAPTER.encode(it).toUint8Array() }
            "localStats" -> telemetry.requestLocalStats().toJs { LocalStats.ADAPTER.encode(it).toUint8Array() }
            "health" -> telemetry.requestHealth(node).toJs { HealthMetrics.ADAPTER.encode(it).toUint8Array() }
            "host" -> telemetry.requestHost(node).toJs { HostMetrics.ADAPTER.encode(it).toUint8Array() }
            "trafficManagement" ->
                telemetry.requestTrafficManagement(node).toJs { TrafficManagementStats.ADAPTER.encode(it).toUint8Array() }
            else -> failure("unsupported")
        }
    }

    private fun sending(send: () -> MessageHandle): SendHandleJs {
        val handle = try {
            send()
        } catch (e: Throwable) {
            throw e.toJsError().unsafeCast<Throwable>()
        }
        val js = jso<dynamic>()
        js.id = handle.id.raw
        js.outcome = scope.promise { handle.await().toJs(handle.id.raw) }
        return js.unsafeCast<SendHandleJs>()
    }

    private fun <T> Flow<T>.subscribe(): () -> Unit {
        val job = launchIn(scope)
        return { job.cancel() }
    }
}

@JsExport
fun createHttpClient(
    url: String,
    allowPrompt: Boolean = false,
    maxAttempts: Int = 10,
    storage: StorageJs? = null,
): MeshtasticClient = MeshtasticClient(HttpTransport(url.trimEnd('/'), allowPrompt), maxAttempts, storage)

/**
 * A client over Web Serial. `port` is a `SerialPort` picked inside a user
 * gesture, or null to reopen the permitted port matching the USB ids
 * without prompting.
 */
@JsExport
fun createSerialClient(
    port: dynamic,
    usbVendorId: Int?,
    usbProductId: Int?,
    maxAttempts: Int = 10,
    storage: StorageJs? = null,
): MeshtasticClient = MeshtasticClient(WebSerialTransport(port, usbVendorId, usbProductId), maxAttempts, storage)

/**
 * A client over Web Bluetooth. `device` is a `BluetoothDevice` picked inside
 * a user gesture, or null to look `deviceId` up through `getDevices()`
 * without prompting.
 */
@JsExport
fun createBluetoothClient(
    device: dynamic,
    deviceId: String?,
    maxAttempts: Int = 10,
    storage: StorageJs? = null,
): MeshtasticClient = MeshtasticClient(WebBluetoothTransport(device, deviceId), maxAttempts, storage)
