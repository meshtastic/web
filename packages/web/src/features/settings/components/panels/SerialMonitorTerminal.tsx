import { Button } from "@shared/components/ui/button";
import { IconButton } from "@shared/components/ui/icon-button";
import { TooltipProvider } from "@shared/components/ui/tooltip";
import { useDevice } from "@state/index";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import {
  ClipboardCopyIcon,
  DownloadIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

interface SerialMonitorTerminalProps {
  onClose: () => void;
}

export default function SerialMonitorTerminal({
  onClose,
}: SerialMonitorTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const bufferRef = useRef("");
  const device = useDevice();

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current) return;

    const terminal = new Terminal({
      cursorBlink: false,
      fontSize: 14,
      fontFamily: "monospace",
      theme: {
        background: "#1a1a1a",
        foreground: "#d4d4d4",
      },
      convertEol: true,
      scrollback: 10000,
      disableStdin: true,
    });

    const fit = new FitAddon();
    terminal.loadAddon(fit);
    terminal.open(terminalRef.current);
    fit.fit();

    terminalInstance.current = terminal;
    fitAddon.current = fit;

    const observer = new ResizeObserver(() => {
      fit.fit();
    });
    observer.observe(terminalRef.current);

    return () => {
      observer.disconnect();
      terminal.dispose();
      terminalInstance.current = null;
      fitAddon.current = null;
    };
  }, []);

  // Subscribe to debug log events from the existing connection
  useEffect(() => {
    const connection = device.connection;
    if (!connection) return;

    const unsubscribe = connection.events.onDeviceDebugLog.subscribe((data) => {
      bufferRef.current += data;
      terminalInstance.current?.write(data);
    });

    terminalInstance.current?.writeln(
      "\x1b[32m--- Serial Monitor Attached ---\x1b[0m",
    );

    return () => {
      unsubscribe();
    };
  }, [device.connection]);

  const clear = useCallback(() => {
    terminalInstance.current?.clear();
    bufferRef.current = "";
  }, []);

  const copyToClipboard = useCallback(async () => {
    await navigator.clipboard.writeText(bufferRef.current);
  }, []);

  const saveToFile = useCallback(() => {
    const blob = new Blob([bufferRef.current], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `serial-log-${new Date().toISOString()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <TooltipProvider>
        <header className="flex h-14 items-center justify-between border-b px-4">
          <h2 className="text-lg font-semibold">Serial Monitor</h2>
          <div className="flex items-center gap-1">
            <IconButton
              tooltip="Clear"
              icon={<Trash2Icon className="size-5" />}
              onClick={clear}
            />
            <IconButton
              tooltip="Copy to clipboard"
              icon={<ClipboardCopyIcon className="size-5" />}
              onClick={() => void copyToClipboard()}
            />
            <IconButton
              tooltip="Save to file"
              icon={<DownloadIcon className="size-5" />}
              onClick={saveToFile}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 ml-2"
              onClick={onClose}
            >
              <XIcon className="size-5" />
            </Button>
          </div>
        </header>
      </TooltipProvider>
      <div ref={terminalRef} className="flex-1 min-h-0 p-2" />
    </div>
  );
}
