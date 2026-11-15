package org.meshtastic.sdk.js

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
}
