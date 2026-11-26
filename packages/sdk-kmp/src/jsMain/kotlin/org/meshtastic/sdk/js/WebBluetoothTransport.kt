package org.meshtastic.sdk.js

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.await
import kotlinx.coroutines.cancel
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.khronos.webgl.ArrayBuffer
import org.khronos.webgl.Uint8Array
import org.meshtastic.sdk.Frame
import org.meshtastic.sdk.TransportIdentity
import org.meshtastic.sdk.TransportState
import kotlin.js.Promise

/**
 * Web Bluetooth as an SDK transport, on the Meshtastic GATT service: `fromnum`
 * notifications wake a drain of `fromradio` until it reads empty, and sends
 * are acknowledged writes to `toradio`. Never prompts: `device` is a
 * `BluetoothDevice` the host obtained from `requestDevice()` inside a user
 * gesture, or null, in which case connects look `deviceId` up through
 * `navigator.bluetooth.getDevices()`.
 */
internal class WebBluetoothTransport(
    private var device: dynamic,
    deviceId: String?,
) : BrowserTransport() {
    override val identity: TransportIdentity =
        TransportIdentity("ble:${deviceId ?: (device?.id as? String) ?: "?"}")
    private val wantedId: String? = deviceId ?: device?.id as? String
    private val _state = MutableStateFlow<TransportState>(TransportState.Disconnected)
    override val state: StateFlow<TransportState> = _state.asStateFlow()
    private val inbound = Channel<Frame>(Channel.UNLIMITED)
    private var scope: CoroutineScope? = null
    private var server: dynamic = null
    private var toRadio: dynamic = null
    private var fromRadio: dynamic = null
    private var fromNum: dynamic = null
    private var closing = false
    /** Chrome rejects overlapping GATT operations on one device, so reads and writes take turns. */
    private val gatt = Mutex()
    private var draining = false
    private var drainWanted = false

    private val onGattDisconnected: (dynamic) -> Unit = { _ -> dropped("Bluetooth device disconnected") }
    private val onFromNumChanged: (dynamic) -> Unit = { _ -> wakeDrain() }

    override suspend fun connect() {
        _state.value = TransportState.Connecting
        closing = false
        try {
            val bluetooth = bluetoothApi() ?: throw ClientException(
                UNSUPPORTED,
                "Web Bluetooth is not supported in this browser",
            )
            val d = device ?: findDevice(bluetooth) ?: throw ClientException(
                UNAVAILABLE,
                "Bluetooth device not available. Re-select the device.",
            )
            device = d
            val gatt = d.gatt ?: throw ClientException(UNAVAILABLE, "Device does not expose a GATT server. Re-pair the device.")
            server = connectGatt(gatt)
            val service = try {
                (server.getPrimaryService(SERVICE_UUID) as Promise<dynamic>).await()
            } catch (e: Throwable) {
                throw ClientException(
                    MISSING_SERVICE,
                    "Device does not advertise the Meshtastic GATT service. The firmware may be too old or the device is in another mode.",
                )
            }
            toRadio = (service.getCharacteristic(TORADIO_UUID) as Promise<dynamic>).await()
            fromRadio = (service.getCharacteristic(FROMRADIO_UUID) as Promise<dynamic>).await()
            fromNum = (service.getCharacteristic(FROMNUM_UUID) as Promise<dynamic>).await()
            d.addEventListener("gattserverdisconnected", onGattDisconnected)
            (fromNum.startNotifications() as Promise<dynamic>).await()
            fromNum.addEventListener("characteristicvaluechanged", onFromNumChanged)
        } catch (e: CancellationException) {
            _state.value = TransportState.Disconnected
            release()
            throw e
        } catch (e: Throwable) {
            val cause = if (e is ClientException) e else ClientException(UNAVAILABLE, bluetoothFailure(e))
            _state.value = connectFailed(cause)
            release()
            throw cause
        }
        _state.value = TransportState.Connected
        scope = CoroutineScope(SupervisorJob())
        wakeDrain()
    }

    override suspend fun disconnect() {
        closing = true
        scope?.cancel()
        scope = null
        release()
        discardQueued()
        _state.value = TransportState.Disconnected
    }

    override suspend fun send(frame: Frame) {
        val characteristic = toRadio ?: throw ClientException("transport", "Bluetooth device is not connected")
        val payload = payloadOf(frame).toUint8Array()
        val buffer: ArrayBuffer = payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.length)
        try {
            gatt.withLock {
                val write = if (characteristic.writeValueWithResponse != null) {
                    characteristic.writeValueWithResponse(buffer)
                } else {
                    characteristic.writeValue(buffer)
                }
                (write as Promise<Unit>).await()
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Throwable) {
            dropped(e.message ?: "Bluetooth write failed")
            return
        }
        wakeDrain()
    }

    override fun frames(): Flow<Frame> = inbound.receiveAsFlow()

    /** Frames the old link queued after the engine stopped reading must not reach the next handshake. */
    private fun discardQueued() {
        while (inbound.tryReceive().isSuccess) {
        }
    }

    private suspend fun findDevice(bluetooth: dynamic): dynamic {
        val id = wantedId ?: return null
        if (bluetooth.getDevices == null) return null
        val known = (bluetooth.getDevices() as Promise<Array<dynamic>>).await()
        return known.firstOrNull { it.id == id }
    }

    private suspend fun connectGatt(gatt: dynamic): dynamic {
        try {
            return (gatt.connect() as Promise<dynamic>).await()
        } catch (first: Throwable) {
            if (!isTransient(first)) throw ClientException(UNAVAILABLE, bluetoothFailure(first))
            delay(TRANSIENT_RETRY_DELAY_MS)
            try {
                return (gatt.connect() as Promise<dynamic>).await()
            } catch (e: Throwable) {
                throw ClientException(
                    UNAVAILABLE,
                    "Bluetooth connection failed twice. Check the device is in range, powered on, and not paired with a phone or another browser tab. Then click Retry.",
                )
            }
        }
    }

    private fun wakeDrain() {
        drainWanted = true
        if (draining) return
        scope?.launch { drain() }
    }

    private suspend fun drain() {
        if (draining) return
        draining = true
        try {
            while (drainWanted && !closing) {
                drainWanted = false
                while (!closing) {
                    val characteristic = fromRadio ?: return
                    val value = gatt.withLock { (characteristic.readValue() as Promise<dynamic>).await() }
                    if (value.byteLength == 0) break
                    val bytes = Uint8Array(value.buffer as ArrayBuffer, value.byteOffset as Int, value.byteLength as Int)
                    inbound.trySend(Frame(framed(bytes.toByteArray())))
                }
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Throwable) {
            dropped(e.message ?: "Bluetooth read failed")
        } finally {
            draining = false
        }
    }

    private fun dropped(reason: String) {
        if (closing || _state.value !is TransportState.Connected) return
        _state.value = TransportState.Error(ClientException(DISCONNECTED, reason), recoverable = true)
        scope?.launch { release() }
    }

    private fun release() {
        val d = device
        try {
            fromNum?.removeEventListener("characteristicvaluechanged", onFromNumChanged)
            fromNum?.stopNotifications()
        } catch (_: Throwable) {
        }
        try {
            d?.removeEventListener("gattserverdisconnected", onGattDisconnected)
            if (server?.connected == true) server.disconnect()
        } catch (_: Throwable) {
        }
        server = null
        toRadio = null
        fromRadio = null
        fromNum = null
    }

    private companion object {
        const val SERVICE_UUID = "6ba1b218-15a8-461f-9fa8-5dcae273eafd"
        const val TORADIO_UUID = "f75c76d2-129e-4dad-a1dd-7866124401e7"
        const val FROMRADIO_UUID = "2c55e69e-4993-11ed-b878-0242ac120002"
        const val FROMNUM_UUID = "ed9da18c-a800-4f66-a670-aa7547e34453"
        const val UNSUPPORTED = "bluetooth-unsupported"
        const val UNAVAILABLE = "bluetooth-unavailable"
        const val MISSING_SERVICE = "bluetooth-missing-service"
        const val DISCONNECTED = "bluetooth-disconnected"
        const val TRANSIENT_RETRY_DELAY_MS = 750L

        fun bluetoothApi(): dynamic {
            val bluetooth = js("globalThis.navigator ? globalThis.navigator.bluetooth : undefined")
            return if (bluetooth == null) null else bluetooth
        }

        fun isTransient(e: Throwable): Boolean =
            e.asDynamic().name == "NetworkError" ||
                Regex("connection attempt failed|gatt", RegexOption.IGNORE_CASE).containsMatchIn(e.message ?: "")

        fun bluetoothFailure(e: Throwable): String =
            "Bluetooth connection failed. Make sure the device is in range, powered on, and not connected to a phone or another browser tab. (${e.message})"
    }
}
