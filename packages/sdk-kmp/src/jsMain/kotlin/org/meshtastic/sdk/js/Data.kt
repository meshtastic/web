@file:OptIn(ExperimentalJsExport::class)

package org.meshtastic.sdk.js

import org.khronos.webgl.Uint8Array
import org.meshtastic.proto.Channel
import org.meshtastic.proto.Config
import org.meshtastic.proto.DeviceMetadata
import org.meshtastic.proto.ModuleConfig
import org.meshtastic.proto.MyNodeInfo
import org.meshtastic.proto.NodeInfo
import org.meshtastic.sdk.ConfigBundle
import org.meshtastic.sdk.NodeChange
import org.meshtastic.sdk.SendFailure
import org.meshtastic.sdk.SendOutcome
import kotlin.js.ExperimentalJsExport
import kotlin.js.JsExport

/** The device's config as the handshake delivered it; every field is an encoded protobuf. */
@JsExport
external interface ConfigBundleJs {
    val myInfo: Uint8Array
    val metadata: Uint8Array
    val configs: Array<Uint8Array>
    val moduleConfigs: Array<Uint8Array>
}

/**
 * One change to the node database. `snapshot` carries `nodes`, `added` and
 * `updated` carry `node` (an encoded `NodeInfo`), `removed`, `went-offline`
 * and `came-online` carry `nodeNum`.
 */
@JsExport
external interface NodeChangeJs {
    val kind: String
    val nodes: Array<Uint8Array>?
    val node: Uint8Array?
    val nodeNum: Int
}

/** Terminal state of a sent packet. */
@JsExport
external interface SendOutcomeJs {
    val id: Int
    val ok: Boolean
    val reason: String?
}

internal fun ConfigBundle.toJs(): ConfigBundleJs {
    val bundle = jso<dynamic>()
    bundle.myInfo = MyNodeInfo.ADAPTER.encode(myInfo).toUint8Array()
    bundle.metadata = DeviceMetadata.ADAPTER.encode(metadata).toUint8Array()
    bundle.configs = configs.map { Config.ADAPTER.encode(it).toUint8Array() }.toTypedArray()
    bundle.moduleConfigs = moduleConfigs.map { ModuleConfig.ADAPTER.encode(it).toUint8Array() }.toTypedArray()
    return bundle.unsafeCast<ConfigBundleJs>()
}

internal fun List<Channel>.toJs(): Array<Uint8Array> = map { Channel.ADAPTER.encode(it).toUint8Array() }.toTypedArray()

internal fun NodeInfo.encodeJs(): Uint8Array = NodeInfo.ADAPTER.encode(this).toUint8Array()

internal fun NodeChange.toJs(): NodeChangeJs {
    val change = jso<dynamic>()
    change.nodes = null
    change.node = null
    change.nodeNum = 0
    when (this) {
        is NodeChange.Snapshot -> {
            change.kind = "snapshot"
            change.nodes = nodes.values.map { it.encodeJs() }.toTypedArray()
        }
        is NodeChange.Added -> {
            change.kind = "added"
            change.node = node.encodeJs()
            change.nodeNum = node.num
        }
        is NodeChange.Updated -> {
            change.kind = "updated"
            change.node = node.encodeJs()
            change.nodeNum = node.num
        }
        is NodeChange.Removed -> {
            change.kind = "removed"
            change.nodeNum = nodeId.raw
        }
        is NodeChange.WentOffline -> {
            change.kind = "went-offline"
            change.nodeNum = nodeId.raw
        }
        is NodeChange.CameOnline -> {
            change.kind = "came-online"
            change.nodeNum = nodeId.raw
        }
    }
    return change.unsafeCast<NodeChangeJs>()
}

internal fun SendOutcome.toJs(id: Int): SendOutcomeJs {
    val outcome = jso<dynamic>()
    outcome.id = id
    outcome.ok = this is SendOutcome.Success
    outcome.reason = when (this) {
        SendOutcome.Success -> null
        is SendOutcome.Failure -> reason.kind()
    }
    return outcome.unsafeCast<SendOutcomeJs>()
}

internal fun SendFailure.kind(): String = when (this) {
    SendFailure.NoRoute -> "no-route"
    SendFailure.MaxRetransmit -> "max-retransmit"
    SendFailure.Timeout -> "timeout"
    SendFailure.DutyCycleLimit -> "duty-cycle-limit"
    SendFailure.Disconnected -> "disconnected"
    SendFailure.HandshakeFailed -> "handshake-failed"
    SendFailure.Cancelled -> "cancelled"
    SendFailure.IdCollision -> "id-collision"
    SendFailure.AckTimeout -> "ack-timeout"
    is SendFailure.QueueRejected -> "queue-rejected"
    is SendFailure.Other -> routingError.name
    is SendFailure.Unknown -> message
}
