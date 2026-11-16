package org.meshtastic.sdk.js

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class FromRadioSplitTest {
    private val myInfo = byteArrayOf(0x1A, 0x02, 0x08, 0x01)
    private val nodeInfo = byteArrayOf(0x22, 0x03, 0x08, 0x02, 0x10)
    private val configComplete = byteArrayOf(0x38, 0xB9.toByte(), 0x60)

    @Test
    fun splits_back_to_back_messages_at_each_payload_field() {
        val parts = splitFromRadio(myInfo + nodeInfo + configComplete)

        assertEquals(listOf(myInfo, nodeInfo, configComplete).map { it.toList() }, parts.map { it.toList() })
    }

    @Test
    fun keeps_an_id_with_the_payload_that_follows_it() {
        val withId = byteArrayOf(0x08, 0x07) + nodeInfo

        val parts = splitFromRadio(myInfo + withId)

        assertEquals(listOf(myInfo, withId).map { it.toList() }, parts.map { it.toList() })
    }

    @Test
    fun an_empty_body_holds_no_messages() {
        assertEquals(emptyList(), splitFromRadio(ByteArray(0)))
    }

    @Test
    fun a_truncated_body_is_rejected() {
        assertFailsWith<ClientException> { splitFromRadio(myInfo + nodeInfo.copyOfRange(0, 3)) }
    }
}
