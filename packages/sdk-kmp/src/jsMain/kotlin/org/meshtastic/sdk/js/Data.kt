@file:OptIn(ExperimentalJsExport::class)

package org.meshtastic.sdk.js

import org.khronos.webgl.Uint8Array
import org.meshtastic.proto.NodeInfo
import org.meshtastic.sdk.NodeChange
import org.meshtastic.sdk.SendFailure
import org.meshtastic.sdk.SendOutcome
import kotlin.js.ExperimentalJsExport
import kotlin.js.JsExport
import kotlin.js.Promise

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

/** A packet handed to the SDK: its id straight away, its outcome once the mesh answers. */
@JsExport
external interface SendHandleJs {
    val id: Int
    val outcome: Promise<SendOutcomeJs>
}

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
    SendFailure.RateLimited -> "RATE_LIMIT_EXCEEDED"
    SendFailure.Disconnected -> "disconnected"
    SendFailure.HandshakeFailed -> "handshake-failed"
    SendFailure.Cancelled -> "cancelled"
    SendFailure.IdCollision -> "id-collision"
    SendFailure.AckTimeout -> "ack-timeout"
    is SendFailure.QueueRejected -> "queue-rejected"
    is SendFailure.Other -> routingError.name
    is SendFailure.Unknown -> message
}
