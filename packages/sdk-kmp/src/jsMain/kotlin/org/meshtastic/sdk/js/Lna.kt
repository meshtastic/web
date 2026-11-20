package org.meshtastic.sdk.js

import kotlinx.browser.window
import kotlinx.coroutines.await
import kotlin.js.Promise

internal object Lna {
    const val DENIED = "lna-denied"
    const val PROMPT = "lna-prompt"

    private val permissionNames = listOf("local-network", "local-network-access")

    fun needsLocalTarget(url: String): Boolean =
        url.startsWith("http:") && window.location.protocol == "https:" && !isLoopback(url)

    fun requestInit(url: String, method: String): dynamic {
        val init = jso<dynamic>()
        init.method = method
        if (needsLocalTarget(url)) init.targetAddressSpace = "local"
        return init
    }

    suspend fun permission(): String {
        val permissions = js("navigator.permissions")
        if (js("globalThis.isSecureContext") != true || permissions == null || permissions.query == null) return "unsupported"
        for (name in permissionNames) {
            val query = jso<dynamic>()
            query.name = name
            val state = try {
                (permissions.query(query) as Promise<dynamic>).await().state as String
            } catch (_: Throwable) {
                continue
            }
            return state
        }
        return "unsupported"
    }

    suspend fun check(url: String, allowPrompt: Boolean) {
        if (!needsLocalTarget(url)) return
        when (permission()) {
            "denied" -> throw ClientException(DENIED, "Local network access denied")
            "prompt" -> if (!allowPrompt) throw ClientException(PROMPT, "Local network access not yet allowed")
        }
    }

    suspend fun classify(url: String, failure: Throwable): Throwable {
        if (failure is ClientException || !needsLocalTarget(url)) return failure
        return when (permission()) {
            "denied" -> ClientException(DENIED, "Local network access denied")
            "prompt" -> ClientException(PROMPT, "Local network access not yet allowed")
            else -> failure
        }
    }

    private fun isLoopback(url: String): Boolean {
        val host = try {
            org.w3c.dom.url.URL(url).hostname.lowercase()
        } catch (_: Throwable) {
            return false
        }
        return host == "localhost" || host.endsWith(".localhost") || host == "[::1]" ||
            Regex("""^127\.\d+\.\d+\.\d+$""").matches(host)
    }
}
