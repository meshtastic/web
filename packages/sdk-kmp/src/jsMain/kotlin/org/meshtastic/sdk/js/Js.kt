package org.meshtastic.sdk.js

import kotlin.js.Promise

internal fun <T : Any> jso(): T = js("({})").unsafeCast<T>()

internal external fun fetch(url: String, init: dynamic = definedExternally): Promise<dynamic>

internal class ClientException(val kind: String, message: String) : Exception(message)

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
