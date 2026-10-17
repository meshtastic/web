import {
  SettingsGroup,
  SettingsSections,
} from "@components/PageComponents/SettingsPages/SettingsSection.tsx";
import { Button } from "@components/UI/Button.tsx";
import { Input } from "@components/UI/Input.tsx";
import { Subtle } from "@components/UI/Typography/Subtle.tsx";
import { cn } from "@core/utils/cn.ts";
import {
  type DeviceLogEntry,
  filterLogEntries,
  formatLogEntry,
} from "@core/utils/logRecords.ts";
import { Protobuf } from "@meshtastic/sdk";
import { useActiveClient } from "@meshtastic/sdk-react";
import { useNavigate } from "@tanstack/react-router";
import { DownloadIcon, ShieldIcon, Trash2Icon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { type ConfigProps, SettingsCard } from "./SettingsTabs.tsx";

/** Records kept in memory; older ones are dropped. */
const MAX_ENTRIES = 2000;

const levelClass = (level: Protobuf.Mesh.LogRecord_Level) => {
  const Level = Protobuf.Mesh.LogRecord_Level;
  if (level >= Level.ERROR) return "text-red-600 dark:text-red-400";
  if (level === Level.WARNING) return "text-amber-600 dark:text-amber-400";
  if (level === Level.DEBUG || level === Level.TRACE)
    return "text-slate-500 dark:text-slate-400";
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

  const exportLogs = () => {
    const text = `${shown.map(formatLogEntry).join("\n")}\n`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `Meshtastic_device_log_${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <SettingsCard>
      <SettingsSections>
        <SettingsGroup
          title={t("settingsPages.debug.title")}
          description={t("settingsPages.debug.description")}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="link"
              className="px-0"
              onClick={() => navigate({ to: "/settings/security" })}
            >
              <ShieldIcon className="mr-2 size-4" />
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
              variant="outline"
              disabled={shown.length === 0}
              onClick={exportLogs}
            >
              <DownloadIcon className="mr-2 size-4" />
              {t("settingsPages.debug.export")}
            </Button>
            <Button
              variant="outline"
              disabled={entries.length === 0}
              onClick={() => setEntries([])}
            >
              <Trash2Icon className="mr-2 size-4" />
              {t("settingsPages.debug.clear")}
            </Button>
          </div>
          <Subtle>
            {t("settingsPages.debug.count", {
              shown: shown.length,
              total: entries.length,
            })}
            {entries.length >= MAX_ENTRIES &&
              ` ${t("settingsPages.debug.capped", { max: MAX_ENTRIES })}`}
          </Subtle>
          <div
            role="log"
            aria-live="polite"
            className="max-h-[60vh] min-h-40 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
          >
            {shown.length === 0 ? (
              <Subtle>
                {entries.length === 0
                  ? t("settingsPages.debug.empty")
                  : t("settingsPages.debug.noMatch")}
              </Subtle>
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
        </SettingsGroup>
      </SettingsSections>
    </SettingsCard>
  );
};
