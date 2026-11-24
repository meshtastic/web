import {
  SettingsBlock,
  SettingsGroup,
  SettingsSections,
} from "@components/PageComponents/SettingsPages/SettingsSection.tsx";
import { Button } from "@components/UI/Button.tsx";
import { Input } from "@components/UI/Input.tsx";
import { cn } from "@core/utils/cn.ts";
import { downloadTextFile } from "@core/utils/downloadText.ts";
import {
  type DeviceLogEntry,
  filterLogEntries,
  formatLogEntry,
} from "@core/utils/logRecords.ts";
import { Protobuf } from "@core/protobuf.ts";
import { useActiveClient } from "@core/kmp/hooks";
import { useNavigate } from "@tanstack/react-router";
import { DownloadIcon, ShieldIcon, Trash2Icon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ConfigProps } from "./sectionProps.ts";

/** Records kept in memory; older ones are dropped. */
const MAX_ENTRIES = 2000;

const levelClass = (level: Protobuf.Mesh.LogRecord_Level) => {
  const Level = Protobuf.Mesh.LogRecord_Level;
  if (level >= Level.ERROR) return "text-danger";
  if (level === Level.WARNING) return "text-warning";
  if (level === Level.DEBUG || level === Level.TRACE) return "text-muted";
  return "";
};

/**
 * Android's Debug panel, for the device log records the node streams (the
 * SDK's onLogRecord event). The SDK doesn't keep them, so the page collects
 * them from when it's opened.
 */
export const DebugPanel = (_props: ConfigProps) => {
  const { t } = useTranslation("ui");
  const navigate = useNavigate();
  const client = useActiveClient();
  const [entries, setEntries] = useState<DeviceLogEntry[]>([]);
  const [query, setQuery] = useState("");
  const nextId = useRef(0);

  useEffect(() => {
    if (!client) return;
    return client.events.onLogRecord.subscribe((record) => {
      const entry: DeviceLogEntry = {
        id: nextId.current++,
        receivedAt: Date.now(),
        record,
      };
      setEntries((current) => [...current, entry].slice(-MAX_ENTRIES));
    });
  }, [client]);

  const shown = useMemo(
    () => filterLogEntries(entries, query),
    [entries, query],
  );

  const exportLogs = () =>
    downloadTextFile(
      `Meshtastic_device_log_${new Date().toISOString().replace(/[:.]/g, "-")}.txt`,
      `${shown.map(formatLogEntry).join("\n")}\n`,
    );

  return (
    <>
      <SettingsSections>
        <SettingsGroup
          title={t("settingsPages.debug.title")}
          description={t("settingsPages.debug.description")}
        >
          <SettingsBlock>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="link"
                className="px-0"
                onClick={() => navigate({ to: "/settings/security" })}
              >
                <ShieldIcon aria-hidden="true" className="mr-2 size-4" />
                {t("settingsPages.debug.securityLink")}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                className="max-w-sm"
                type="search"
                aria-label={t("settingsPages.debug.search")}
                placeholder={t("settingsPages.debug.search")}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <Button
                variant="secondary"
                disabled={shown.length === 0}
                onClick={exportLogs}
              >
                <DownloadIcon aria-hidden="true" className="mr-2 size-4" />
                {t("settingsPages.debug.export")}
              </Button>
              <Button
                variant="secondary"
                disabled={entries.length === 0}
                onClick={() => setEntries([])}
              >
                <Trash2Icon aria-hidden="true" className="mr-2 size-4" />
                {t("settingsPages.debug.clear")}
              </Button>
            </div>
            <p className="m-0 text-help text-muted">
              {t("settingsPages.debug.count", {
                shown: shown.length,
                total: entries.length,
              })}
              {entries.length >= MAX_ENTRIES &&
                ` ${t("settingsPages.debug.capped", { max: MAX_ENTRIES })}`}
            </p>
            <div
              role="log"
              aria-live="polite"
              className="max-h-[60vh] min-h-40 overflow-auto rounded-control border border-input bg-app p-3 font-mono text-meta"
            >
              {shown.length === 0 ? (
                <p className="m-0 text-help text-muted">
                  {entries.length === 0
                    ? t("settingsPages.debug.empty")
                    : t("settingsPages.debug.noMatch")}
                </p>
              ) : (
                shown.map((entry) => (
                  <div
                    key={entry.id}
                    className={cn(
                      "whitespace-pre-wrap break-all",
                      levelClass(entry.record.level),
                    )}
                  >
                    {formatLogEntry(entry)}
                  </div>
                ))
              )}
            </div>
          </SettingsBlock>
        </SettingsGroup>
      </SettingsSections>
    </>
  );
};
