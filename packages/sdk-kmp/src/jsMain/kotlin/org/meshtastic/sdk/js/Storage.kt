@file:OptIn(ExperimentalJsExport::class)

package org.meshtastic.sdk.js

import org.meshtastic.sdk.LogLevel
import org.meshtastic.sdk.StorageProvider
import org.meshtastic.sdk.storage.sqldelight.SqlDelightStorageProvider
import org.w3c.dom.Worker
import kotlin.js.ExperimentalJsExport
import kotlin.js.JsExport

/** An opaque storage handle created by [createBrowserStorage] and passed to a client factory. */
@JsExport
class SdkStorage internal constructor(internal val provider: StorageProvider)

/**
 * Creates SQLDelight storage whose databases run in workers made by [createWorker], bounded so that
 * a backend that hangs or fails degrades to in-memory instead of stalling the client.
 *
 * @param baseDir key prefix for the database index, or `""` for in-memory mode
 * @param createWorker starts the worker for one database file
 * @param timeoutMs how long one storage call may take before storage is abandoned
 */
@JsExport
fun createBrowserStorage(
    baseDir: String,
    createWorker: (dbFile: String) -> Worker,
    timeoutMs: Int = 5000,
): SdkStorage = SdkStorage(
    BoundedStorageProvider(
        SqlDelightStorageProvider(baseDir, createWorker),
        timeoutMs.toLong(),
        log = { JsLogSink.log(LogLevel.WARN, "Storage", it, null) },
    ),
)
