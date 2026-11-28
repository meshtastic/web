@file:OptIn(ExperimentalJsExport::class)

package org.meshtastic.sdk.js

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.promise
import org.khronos.webgl.Uint8Array
import org.meshtastic.proto.AdminMessage
import org.meshtastic.proto.Channel
import org.meshtastic.proto.Config
import org.meshtastic.proto.DeviceMetadata
import org.meshtastic.proto.ModuleConfig
import org.meshtastic.proto.User
import org.meshtastic.sdk.AdminApi
import org.meshtastic.sdk.AdminEdit
import org.meshtastic.sdk.AdminResult
import org.meshtastic.sdk.ChannelIndex
import org.meshtastic.sdk.NodeId
import kotlin.js.ExperimentalJsExport
import kotlin.js.JsExport
import kotlin.js.Promise
import kotlin.time.Duration.Companion.seconds

/**
 * Outcome of an admin request. `value` carries the encoded response message
 * for getters that answer with a protobuf, `text` for those that answer
 * with a string.
 */
@JsExport
external interface AdminResultJs {
    val ok: Boolean
    val reason: String?
    val value: Uint8Array?
    val text: String?
}

/** Admin messages addressed to one node; `MeshtasticClient.admin(dest)`. */
@JsExport
class AdminJs internal constructor(private val api: AdminApi, private val scope: CoroutineScope) {
    /** Sends one encoded `AdminMessage` and waits for its result. */
    fun send(adminMessage: Uint8Array): Promise<AdminResultJs> = scope.promise {
        api.dispatch(AdminMessage.ADAPTER.decode(adminMessage.toByteArray()))
    }

    /**
     * Sends encoded `AdminMessage`s as one settings transaction. Config,
     * module config, owner, channel, favorite and ignored writes go between
     * `begin_edit_settings` and `commit_edit_settings`; anything else is
     * sent before them on its own.
     */
    fun editSettings(adminMessages: Array<Uint8Array>): Promise<AdminResultJs> = scope.promise {
        val decoded = adminMessages.map { AdminMessage.ADAPTER.decode(it.toByteArray()) }
        val (batched, standalone) = decoded.partition { it.isBatchable() }
        for (message in standalone) {
            val result = api.dispatch(message)
            if (!result.ok) return@promise result
        }
        if (batched.isEmpty()) return@promise AdminResult.Success(Unit).toJs()
        api.editSettings { for (message in batched) apply(message) }.toJs()
    }
}

private fun AdminMessage.isBatchable(): Boolean =
    set_config != null || set_module_config != null || set_owner != null || set_channel != null ||
        set_favorite_node != null || remove_favorite_node != null ||
        set_ignored_node != null || remove_ignored_node != null

private suspend fun AdminEdit.apply(message: AdminMessage) {
    message.set_config?.let { setConfig(it) }
    message.set_module_config?.let { setModuleConfig(it) }
    message.set_owner?.let { setOwner(it) }
    message.set_channel?.let { setChannel(it) }
    message.set_favorite_node?.let { setFavorite(NodeId(it), true) }
    message.remove_favorite_node?.let { setFavorite(NodeId(it), false) }
    message.set_ignored_node?.let { setIgnored(NodeId(it), true) }
    message.remove_ignored_node?.let { setIgnored(NodeId(it), false) }
}

private suspend fun AdminApi.dispatch(message: AdminMessage): AdminResultJs {
    message.set_config?.let { return setConfig(it).toJs() }
    message.set_module_config?.let { return setModuleConfig(it).toJs() }
    message.set_owner?.let { return setOwner(it).toJs() }
    message.set_channel?.let { return setChannel(it).toJs() }
    message.set_fixed_position?.let { return setFixedPosition(it).toJs() }
    if (message.remove_fixed_position == true) return removeFixedPosition().toJs()
    message.set_canned_message_module_messages?.let { return setCannedMessages(it).toJs() }
    message.set_ringtone_message?.let { return setRingtone(it).toJs() }
    message.set_favorite_node?.let { return setFavorite(NodeId(it), true).toJs() }
    message.remove_favorite_node?.let { return setFavorite(NodeId(it), false).toJs() }
    message.set_ignored_node?.let { return setIgnored(NodeId(it), true).toJs() }
    message.remove_ignored_node?.let { return setIgnored(NodeId(it), false).toJs() }
    message.remove_by_nodenum?.let { return removeNode(NodeId(it)).toJs() }
    message.add_contact?.let { return addContact(it).toJs() }
    message.get_config_request?.let { return getConfig(it).toJs { Config.ADAPTER.encode(it).toUint8Array() } }
    message.get_module_config_request?.let {
        return getModuleConfig(it).toJs { ModuleConfig.ADAPTER.encode(it).toUint8Array() }
    }
    if (message.get_owner_request == true) return getOwner().toJs { User.ADAPTER.encode(it).toUint8Array() }
    message.get_channel_request?.let {
        return getChannel(ChannelIndex(it - 1)).toJs { Channel.ADAPTER.encode(it).toUint8Array() }
    }
    if (message.get_device_metadata_request == true) {
        return getDeviceMetadata().toJs { DeviceMetadata.ADAPTER.encode(it).toUint8Array() }
    }
    if (message.get_canned_message_module_messages_request == true) return getCannedMessages().toJsText { it }
    if (message.get_ringtone_request == true) return getRingtone().toJsText { it }
    message.reboot_seconds?.let { return reboot(it.seconds).toJs() }
    message.reboot_ota_seconds?.let { return rebootOta(it.seconds).toJs() }
    message.shutdown_seconds?.let { return shutdown(it.seconds).toJs() }
    message.factory_reset_device?.let { if (it != 0) return factoryReset().toJs() }
    if (message.nodedb_reset == true) return nodeDbReset().toJs()
    if (message.enter_dfu_mode_request == true) return enterDfuMode().toJs()
    message.set_time_only?.let { return setTimeOnly(it).toJs() }
    message.lockdown_auth?.let { return lockdown(it).toJs() }
    return failure("unsupported")
}

internal fun <T> AdminResult<T>.toJs(encode: (T) -> Uint8Array? = { null }): AdminResultJs = toJs(encode) { null }

internal fun <T> AdminResult<T>.toJsText(text: (T) -> String?): AdminResultJs = toJs({ null }, text)

private fun <T> AdminResult<T>.toJs(encode: (T) -> Uint8Array?, text: (T) -> String?): AdminResultJs {
    val result = jso<dynamic>()
    result.ok = this is AdminResult.Success
    result.reason = null
    result.value = null
    result.text = null
    when (this) {
        is AdminResult.Success -> {
            result.value = encode(value)
            result.text = text(value)
        }
        AdminResult.SessionKeyExpired -> result.reason = "session-key-expired"
        AdminResult.Unauthorized -> result.reason = "unauthorized"
        AdminResult.Timeout -> result.reason = "timeout"
        AdminResult.RateLimited -> result.reason = "rate-limited"
        AdminResult.NodeUnreachable -> result.reason = "node-unreachable"
        is AdminResult.Failed -> result.reason = routingError.name
    }
    return result.unsafeCast<AdminResultJs>()
}

internal fun failure(reason: String): AdminResultJs {
    val result = jso<dynamic>()
    result.ok = false
    result.reason = reason
    result.value = null
    result.text = null
    return result.unsafeCast<AdminResultJs>()
}
