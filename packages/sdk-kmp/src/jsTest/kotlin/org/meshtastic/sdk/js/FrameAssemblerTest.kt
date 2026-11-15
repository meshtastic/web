package org.meshtastic.sdk.js

import org.khronos.webgl.Uint8Array
import org.meshtastic.sdk.Frame
import kotlin.test.Test
import kotlin.test.assertEquals

class FrameAssemblerTest {
    private val frames = mutableListOf<Frame>()
    private val assembler = FrameAssembler { frames.add(it) }

    @Test
    fun reassembles_a_frame_split_across_chunks() {
        val payload = byteArrayOf(1, 2, 3, 4, 5)
        val wire = framed(payload).toByteArray()
        assembler.feed(wire.copyOfRange(0, 3))
        assembler.feed(wire.copyOfRange(3, 6))
        assembler.feed(wire.copyOfRange(6, wire.size))
        assertEquals(listOf(Frame(framed(payload))), frames)
    }

    @Test
    fun skips_garbage_and_log_text_between_frames() {
        val payload = byteArrayOf(9, 8, 7)
        val wire = "INFO | boot\n".encodeToByteArray() + framed(payload).toByteArray() + byteArrayOf(0x94.toByte(), 0x00)
        assembler.feed(wire)
        assertEquals(listOf(Frame(framed(payload))), frames)
    }

    @Test
    fun resyncs_after_an_oversized_length() {
        val bogus = byteArrayOf(0x94.toByte(), 0xC3.toByte(), 0x7F, 0x00)
        val payload = byteArrayOf(42)
        assembler.feed(bogus + framed(payload).toByteArray())
        assertEquals(listOf(Frame(framed(payload))), frames)
    }

    @Test
    fun a_doubled_start_byte_still_frames() {
        val payload = byteArrayOf(1)
        assembler.feed(byteArrayOf(0x94.toByte()) + framed(payload).toByteArray())
        assertEquals(listOf(Frame(framed(payload))), frames)
    }

    @Test
    fun payload_round_trips_through_the_header() {
        val payload = ByteArray(512) { it.toByte() }
        val frame = Frame(framed(payload))
        assertEquals(516, frame.bytes.size)
        assertEquals(payload.toList(), payloadOf(frame).toList())
    }

    @Test
    fun payloads_handed_to_js_are_exact_copies_whatever_the_chunk_view_offsets() {
        val first = ByteArray(300) { (it * 7).toByte() }
        val second = byteArrayOf(0x94.toByte(), 0xC3.toByte(), 0x1A, 0x02, 0x08, 0x01)
        val wire = framed(first).toByteArray() + framed(second).toByteArray()
        val padded = Uint8Array(wire.size + 16)
        for (i in wire.indices) padded.asDynamic()[i + 8] = wire[i]
        val view = padded.subarray(8, 8 + wire.size)
        val chunks = listOf(view.subarray(0, 150), view.subarray(150, 310), view.subarray(310, view.length))

        for (chunk in chunks) assembler.feed(chunk.toByteArray())

        assertEquals(2, frames.size)
        val payloads = frames.map { payloadOf(it).toUint8Array() }
        assertEquals(first.toList(), payloads[0].toByteArray().toList())
        assertEquals(second.toList(), payloads[1].toByteArray().toList())
        assertEquals(0, payloads[1].byteOffset)
        assertEquals(second.size, payloads[1].buffer.byteLength)
    }
}
