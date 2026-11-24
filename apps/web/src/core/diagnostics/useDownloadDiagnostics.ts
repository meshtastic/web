import { diagnosticsLog } from "@core/log.ts";
import { useDeviceStore } from "@core/stores";
import { BUILD_INFO } from "@core/utils/buildInfo.ts";
import { downloadTextFile } from "@core/utils/downloadText.ts";
import { useCallback } from "react";
import {
  diagnosticsFileName,
  tracesFileName,
  formatDiagnostics,
  type RadioSummary,
  summarizeConnection,
} from "./report.ts";
import { recentSpans, spansToOtlpJson, toSpanSummary } from "./tracing.ts";

/**
 * Returns a handler that saves a diagnostics file: the app and browser,
 * the saved connections, `radio` when one is connected, and the recent log.
 */
export function useDownloadDiagnostics(radio?: RadioSummary): () => void {
  return useCallback(() => {
    const generatedAt = Date.now();
    const text = formatDiagnostics(
      {
        generatedAt,
        build: BUILD_INFO,
        userAgent: globalThis.navigator?.userAgent ?? "",
        pageProtocol: globalThis.location?.protocol ?? "",
        connections: useDeviceStore
          .getState()
          .savedConnections.map(summarizeConnection),
        radio,
        spans: recentSpans().map(toSpanSummary),
      },
      diagnosticsLog.entries(),
    );
    downloadTextFile(diagnosticsFileName(generatedAt), text);
  }, [radio]);
}

/** Returns a handler that saves recent spans as an OTLP/JSON file. */
export function useDownloadTraces(): () => void {
  return useCallback(() => {
    downloadTextFile(
      tracesFileName(Date.now()),
      spansToOtlpJson(recentSpans()),
      "application/json",
    );
  }, []);
}
