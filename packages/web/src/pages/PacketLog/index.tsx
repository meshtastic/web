import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import { type LogEntry, type LogLevel, useLogStore } from "@core/stores/logStore/index.ts";
import {
  ArrowDownToLineIcon,
  DownloadIcon,
  Trash2Icon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const LEVEL_STYLES: Record<LogLevel, string> = {
  debug: "text-slate-400",
  info: "text-sky-400",
  warn: "text-amber-400",
  error: "text-red-400",
};

const ROW_BG: Record<LogLevel, string> = {
  debug: "",
  info: "",
  warn: "bg-amber-950/10",
  error: "bg-red-950/15",
};

const LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${hh}:${mm}:${ss}.${ms}`;
}

function LogRow({ entry }: { entry: LogEntry }) {
  return (
    <div
      className={`flex gap-3 px-3 py-0.5 font-mono text-xs leading-5 hover:brightness-125 ${ROW_BG[entry.level]}`}
    >
      <span className="shrink-0 text-slate-500 select-none">{formatTime(entry.timestamp)}</span>
      <span className={`shrink-0 w-9 uppercase font-semibold ${LEVEL_STYLES[entry.level]}`}>
        {entry.level}
      </span>
      <span className="shrink-0 w-32 text-slate-300 truncate">{entry.event}</span>
      <span className="text-slate-400 min-w-0 break-all">{entry.detail}</span>
    </div>
  );
}

const PacketLogPage = () => {
  const { entries, totalCount, isLoading, loadFromDB, clearAll } = useLogStore();

  const [levelFilter, setLevelFilter] = useState<Set<LogLevel>>(new Set(LEVELS));
  const [search, setSearch] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load persisted entries on first mount
  useEffect(() => {
    loadFromDB();
  }, [loadFromDB]);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "instant" });
    }
  }, [entries, autoScroll]);

  const filtered = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    return entries.filter((e) => {
      if (!levelFilter.has(e.level)) return false;
      if (lowerSearch && !e.event.toLowerCase().includes(lowerSearch) && !e.detail.toLowerCase().includes(lowerSearch)) return false;
      return true;
    });
  }, [entries, levelFilter, search]);

  const toggleLevel = useCallback((level: LogLevel) => {
    setLevelFilter((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  }, []);

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meshtastic-log-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [entries]);

  const handleScrolled = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const nearBottom = scrollHeight - scrollTop - clientHeight < 48;
    setAutoScroll(nearBottom);
  }, []);

  const storedCount = totalCount;
  const liveCount = entries.length;
  const isShowingAll = liveCount >= storedCount;

  return (
    <PageLayout
      label="Packet Log"
      actions={[]}
      leftBar={<Sidebar />}
    >
      <div className="flex flex-col h-full min-h-0">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-slate-700 shrink-0 bg-background-primary">
          {/* Level filter pills */}
          <div className="flex gap-1">
            {LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => toggleLevel(level)}
                className={`px-2 py-0.5 rounded text-xs font-mono font-semibold uppercase transition-opacity border ${
                  levelFilter.has(level)
                    ? `${LEVEL_STYLES[level]} border-current opacity-100`
                    : "text-slate-600 border-slate-700 opacity-50"
                }`}
              >
                {level}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search event or detail…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-32 max-w-64 px-2 py-0.5 text-xs rounded bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500"
          />

          {/* Entry count */}
          <span className="text-xs text-slate-500 whitespace-nowrap ml-auto">
            {isLoading
              ? "Loading…"
              : isShowingAll
                ? `${filtered.length.toLocaleString()} entries`
                : `${filtered.length.toLocaleString()} shown · ${storedCount.toLocaleString()} total stored`}
          </span>

          {/* Auto-scroll toggle */}
          <button
            type="button"
            onClick={() => {
              setAutoScroll((v) => !v);
              if (!autoScroll && bottomRef.current) {
                bottomRef.current.scrollIntoView({ behavior: "smooth" });
              }
            }}
            title={autoScroll ? "Auto-scroll on (click to disable)" : "Auto-scroll off (click to enable)"}
            className={`p-1 rounded transition-colors ${autoScroll ? "text-sky-400" : "text-slate-600"}`}
          >
            <ArrowDownToLineIcon size={15} />
          </button>

          {/* Export */}
          <button
            type="button"
            onClick={handleExport}
            title="Export visible entries as JSON"
            className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors"
          >
            <DownloadIcon size={15} />
          </button>

          {/* Clear */}
          <button
            type="button"
            onClick={clearAll}
            title="Clear all log entries"
            className="p-1 rounded text-slate-400 hover:text-red-400 transition-colors"
          >
            <Trash2Icon size={15} />
          </button>
        </div>

        {/* Log area */}
        <div
          ref={scrollRef}
          onScroll={handleScrolled}
          className="flex-1 min-h-0 overflow-y-auto bg-slate-950 dark:bg-slate-950"
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-slate-500 text-sm font-mono">
              Loading log entries…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-600 text-sm font-mono">
              {entries.length === 0 ? "No log entries yet. Connect a device to start." : "No entries match the current filter."}
            </div>
          ) : (
            <div className="py-1">
              {filtered.map((entry) => (
                <LogRow key={entry.id} entry={entry} />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default PacketLogPage;
