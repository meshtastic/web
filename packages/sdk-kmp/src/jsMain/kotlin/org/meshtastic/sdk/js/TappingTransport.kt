package org.meshtastic.sdk.js

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.onEach
import org.meshtastic.sdk.Frame
import org.meshtastic.sdk.RadioTransport
import org.meshtastic.sdk.TransportIdentity
import org.meshtastic.sdk.TransportState
import org.meshtastic.sdk.WireFraming

internal class TappingTransport(
    private val inner: RadioTransport,
    private val tap: (ByteArray) -> Unit,
) : RadioTransport {
    override val identity: TransportIdentity get() = inner.identity
    override val state: StateFlow<TransportState> get() = inner.state

    override suspend fun connect() = inner.connect()

    override suspend fun disconnect() = inner.disconnect()

    override suspend fun send(frame: Frame) = inner.send(frame)

    override fun frames(): Flow<Frame> = inner.frames().onEach { frame ->
        val bytes = frame.bytes.toByteArray()
        if (bytes.size > WireFraming.HEADER_SIZE) tap(bytes.copyOfRange(WireFraming.HEADER_SIZE, bytes.size))
    }
}
