@file:OptIn(ExperimentalJsExport::class)

package org.meshtastic.sdk.js

import org.meshtastic.sdk.ConnectionState
import org.meshtastic.sdk.LogLevel
import org.meshtastic.sdk.LogSink
import kotlin.js.ExperimentalJsExport
import kotlin.js.JsExport

/** Receives every SDK and facade log line; `level` is `verbose`, `debug`, `info`, `warn` or `error`. */
typealias LogListener = (level: String, tag: String, message: String, error: String?) -> Unit

private var listener: LogListener? = null

/** Routes the SDK's logger to `cb`, or back to silence with null. Applies to every client. */
@JsExport
fun setSdkLogger(cb: LogListener?) {
    listener = cb
}

internal object JsLogSink : LogSink {
    override fun log(level: LogLevel, tag: String, message: String, cause: Throwable?) {
        listener?.invoke(level.name.lowercase(), tag, message, cause?.message)
    }
}

internal fun ConnectionState.describe(): String = when (this) {
    ConnectionState.Disconnected -> "disconnected"
    ConnectionState.Disconnecting -> "disconnecting"
    is ConnectionState.Connecting -> "connecting (attempt $attempt)"
    is ConnectionState.Configuring -> "configuring ${phase.name}"
    ConnectionState.Connected -> "connected"
    is ConnectionState.Reconnecting -> "reconnecting (attempt $attempt): ${cause.message}"
    is ConnectionState.Failed -> "failed: ${cause.message}"
    is ConnectionState.DeviceSleeping -> "device sleeping (wakes within ${expectedWakeSeconds}s)"
}
