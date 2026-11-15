package org.meshtastic.sdk.js

import org.meshtastic.proto.Channel
import org.meshtastic.proto.FromRadio
import org.meshtastic.proto.MeshPacket
import org.meshtastic.proto.MyNodeInfo
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class FromRadioFilterTest {
    @Test
    fun a_packet_frame_is_recognised_after_the_frame_id() {
        val packet = MeshPacket.Builder().also { it.from = 5; it.id = 9 }.build()
        val frame = FromRadio.Builder().also { it.id = 77; it.packet = packet }.build()
        assertTrue(carriesMeshPacket(FromRadio.ADAPTER.encode(frame)))
    }

    @Test
    fun handshake_frames_are_not_packets() {
        val info = MyNodeInfo.Builder().also { it.my_node_num = 42 }.build()
        val myInfo = FromRadio.Builder().also { it.id = 1; it.my_info = info }.build()
        val slot = Channel.Builder().also { it.index = 1 }.build()
        val channel = FromRadio.Builder().also { it.id = 2; it.channel = slot }.build()
        assertFalse(carriesMeshPacket(FromRadio.ADAPTER.encode(myInfo)))
        assertFalse(carriesMeshPacket(FromRadio.ADAPTER.encode(channel)))
    }

    @Test
    fun a_malformed_payload_is_forwarded_rather_than_dropped() {
        assertFalse(carriesMeshPacket(byteArrayOf(0x1A, 0x7F, 0x01)))
    }
}
