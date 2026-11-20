@file:OptIn(ExperimentalJsExport::class)

package org.meshtastic.sdk.js

import org.meshtastic.sdk.ConnectionState
import kotlin.js.ExperimentalJsExport
import kotlin.js.JsExport

@JsExport
external interface ConnectionStateJs {
    val kind: String
    val attempt: Int
    val maxAttempts: Int
    val phase: String?
    val progress: Double
    val error: String?
    val errorKind: String?
}

internal fun ConnectionState.toJs(maxAttempts: Int): ConnectionStateJs {
    val state = jso<dynamic>()
    state.attempt = 0
    state.maxAttempts = maxAttempts
    state.phase = null
    state.progress = 0.0
    state.error = null
    state.errorKind = null
    when (this) {
        ConnectionState.Disconnected -> state.kind = "disconnected"
        is ConnectionState.Connecting -> {
            state.kind = "connecting"
            state.attempt = attempt
        }
        is ConnectionState.Configuring -> {
            state.kind = "configuring"
            state.phase = phase.name
            state.progress = progress.toDouble()
        }
        ConnectionState.Connected -> state.kind = "connected"
        is ConnectionState.Reconnecting -> {
            state.kind = "reconnecting"
            state.attempt = attempt
            state.error = cause.message
            state.errorKind = cause.kind()
        }
    }
    return state.unsafeCast<ConnectionStateJs>()
}
