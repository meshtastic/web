package org.meshtastic.sdk.js

import okio.ByteString
import org.khronos.webgl.Int8Array
import org.khronos.webgl.Uint8Array

internal fun Uint8Array.toByteArray(): ByteArray =
    Int8Array(buffer, byteOffset, length).unsafeCast<ByteArray>()

internal fun ByteArray.toUint8Array(): Uint8Array {
    val i8 = unsafeCast<Int8Array>()
    return Uint8Array(i8.buffer, i8.byteOffset, i8.length)
}

internal fun ByteString.toUint8Array(): Uint8Array = toByteArray().toUint8Array()
