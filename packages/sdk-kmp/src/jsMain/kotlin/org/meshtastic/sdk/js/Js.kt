package org.meshtastic.sdk.js

import kotlin.js.Promise

internal fun <T : Any> jso(): T = js("({})").unsafeCast<T>()

internal external fun fetch(url: String, init: dynamic = definedExternally): Promise<dynamic>

internal class ClientException(val kind: String, message: String) : Exception(message)

/**
 * A browser transport whose failed [org.meshtastic.sdk.RadioTransport.connect] ends the session when
 * [failFast] is set. The SDK retries even the first connect unless the transport reports a
 * non-recoverable error; the app wants a connect the user started to fail at once and only drops
 * of a live session to be retried, so the client sets [failFast] for attempt 0 only.
 */
internal abstract class BrowserTransport : org.meshtastic.sdk.RadioTransport {
    var failFast: Boolean = false

    protected fun connectFailed(cause: Throwable): org.meshtastic.sdk.TransportState =
        if (failFast) {
            org.meshtastic.sdk.TransportState.Error(cause, recoverable = false)
        } else {
            org.meshtastic.sdk.TransportState.Disconnected
        }
}

internal fun Throwable.kind(): String {
    var cause: Throwable? = this
    while (cause != null) {
        if (cause is ClientException) return cause.kind
        cause = cause.cause
    }
    return when (this) {
        is org.meshtastic.sdk.MeshtasticException.HandshakeTimeout -> "handshake-timeout"
        is org.meshtastic.sdk.MeshtasticException.FirmwareTooOld -> "firmware-too-old"
        is org.meshtastic.sdk.MeshtasticException.Protocol -> "protocol"
        is org.meshtastic.sdk.MeshtasticException.AlreadyConnected -> "already-connected"
        is org.meshtastic.sdk.MeshtasticException.NotConnected -> "not-connected"
        else -> "transport"
    }
}

internal fun Throwable.toJsError(): dynamic {
    val error = js("new Error()")
    error.name = kind()
    error.message = message ?: kind()
    return error
}
