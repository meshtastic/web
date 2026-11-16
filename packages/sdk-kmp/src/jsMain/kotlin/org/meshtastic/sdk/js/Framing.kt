package org.meshtastic.sdk.js

import com.squareup.wire.ProtoReader
import okio.Buffer
import okio.ByteString
import okio.ByteString.Companion.toByteString
import org.meshtastic.sdk.Frame
import org.meshtastic.sdk.WireFraming

/** Wraps a bare protobuf payload in the SDK's stream header (`0x94 0xC3 LEN_HI LEN_LO`). */
internal fun framed(payload: ByteArray): ByteString {
    val frame = ByteArray(WireFraming.HEADER_SIZE + payload.size)
    frame[0] = WireFraming.MAGIC_0
    frame[1] = WireFraming.MAGIC_1
    frame[2] = (payload.size shr 8).toByte()
    frame[3] = (payload.size and 0xFF).toByte()
    payload.copyInto(frame, WireFraming.HEADER_SIZE)
    return frame.toByteString()
}

/** The protobuf payload of a framed packet, header removed. */
internal fun payloadOf(frame: Frame): ByteArray {
    val bytes = frame.bytes.toByteArray()
    return if (bytes.size > WireFraming.HEADER_SIZE) bytes.copyOfRange(WireFraming.HEADER_SIZE, bytes.size) else ByteArray(0)
}

/**
 * Re-sync state machine for the serial byte stream, equivalent to the SDK's
 * `SerialFrameAssembler` (which is not in the published js klib). Feed it the
 * chunks a port delivers; it calls [onFrame] with every complete frame,
 * header included, and resynchronises after garbage or an oversized length.
 */
internal class FrameAssembler(private val onFrame: (Frame) -> Unit) {
    private enum class State { SCAN_FOR_START1, EXPECT_START2, READ_LEN_HI, READ_LEN_LO, READ_PAYLOAD }

    private var state = State.SCAN_FOR_START1
    private var lenHi = 0
    private var payloadLen = 0
    private var bytesRemaining = 0
    private val payload = Buffer()

    fun feed(bytes: ByteArray) {
        for (b in bytes) feed(b)
    }

    fun feed(byte: Byte) {
        when (state) {
            State.SCAN_FOR_START1 -> if (byte == WireFraming.MAGIC_0) state = State.EXPECT_START2

            State.EXPECT_START2 -> state = when (byte) {
                WireFraming.MAGIC_1 -> State.READ_LEN_HI
                WireFraming.MAGIC_0 -> State.EXPECT_START2
                else -> State.SCAN_FOR_START1
            }

            State.READ_LEN_HI -> {
                lenHi = byte.toInt() and 0xFF
                state = State.READ_LEN_LO
            }

            State.READ_LEN_LO -> {
                payloadLen = (lenHi shl 8) or (byte.toInt() and 0xFF)
                when {
                    payloadLen > WireFraming.MAX_PAYLOAD_SIZE -> {
                        payload.clear()
                        state = State.SCAN_FOR_START1
                    }

                    payloadLen == 0 -> {
                        state = State.SCAN_FOR_START1
                        onFrame(Frame(framed(ByteArray(0))))
                    }

                    else -> {
                        bytesRemaining = payloadLen
                        state = State.READ_PAYLOAD
                    }
                }
            }

            State.READ_PAYLOAD -> {
                payload.writeByte(byte.toInt())
                if (--bytesRemaining == 0) {
                    val complete = payload.readByteArray()
                    payload.clear()
                    state = State.SCAN_FOR_START1
                    onFrame(Frame(framed(complete)))
                }
            }
        }
    }
}

private const val FROM_RADIO_PACKET_FIELD = 2

/** Whether a `FromRadio` payload holds a `MeshPacket`, read from its field tags without decoding it. */
internal fun carriesMeshPacket(payload: ByteArray): Boolean {
    val reader = ProtoReader(Buffer().write(payload))
    try {
        reader.beginMessage()
        var tag = reader.nextTag()
        while (tag != -1) {
            if (tag == FROM_RADIO_PACKET_FIELD) return true
            reader.skip()
            tag = reader.nextTag()
        }
    } catch (_: Exception) {
        return false
    }
    return false
}

private const val FROM_RADIO_ID_FIELD = 1

/**
 * Splits a `fromradio?all=true` body into its `FromRadio` payloads. The firmware
 * writes them back to back with no length prefix; each carries one payload field,
 * optionally preceded by its `id`, so every field other than `id` ends a message.
 */
internal fun splitFromRadio(body: ByteArray): List<ByteArray> {
    val messages = mutableListOf<ByteArray>()
    var start = 0
    var pos = 0
    fun varint(): Long {
        var result = 0L
        var shift = 0
        while (pos < body.size && shift < 64) {
            val b = body[pos++].toInt() and 0xFF
            result = result or ((b and 0x7F).toLong() shl shift)
            if (b < 0x80) return result
            shift += 7
        }
        throw ClientException("transport", "truncated fromradio body")
    }
    while (pos < body.size) {
        val tag = varint()
        when ((tag and 7).toInt()) {
            0 -> varint()
            1 -> pos += 8
            2 -> {
                val length = varint().toInt()
                pos += length
            }
            5 -> pos += 4
            else -> throw ClientException("transport", "unreadable fromradio body")
        }
        if (pos > body.size) throw ClientException("transport", "truncated fromradio body")
        if ((tag ushr 3).toInt() != FROM_RADIO_ID_FIELD) {
            messages.add(body.copyOfRange(start, pos))
            start = pos
        }
    }
    if (start != body.size) throw ClientException("transport", "truncated fromradio body")
    return messages
}
