import type { routeTree } from "@app/routes.tsx";
import { idleChord, nextChord } from "@core/commandMenu/chords.ts";
import {
  migratePinnedGroups,
  togglePinnedGroup,
} from "@core/commandMenu/pins.ts";
import { buildResults, type GroupLimits } from "@core/commandMenu/results.ts";
import { indexCommands, parseQuery } from "@core/commandMenu/search.ts";
import { isCommandMenuShortcut } from "@core/commandMenu/shortcut.ts";
import {
  buildRegistry,
  deviceCommands,
  nodeCommands,
  pinCommands,
} from "@core/commandMenu/sources.ts";
import type {
  Command,
  CommandAction,
  CommandPageId,
} from "@core/commandMenu/types.ts";
import useLocalStorage from "@core/hooks/useLocalStorage.ts";
import { useToast } from "@core/hooks/useToast.ts";
import { useActiveClient } from "@core/kmp/hooks";
import { useAppStore, useDevice, useDeviceStore } from "@core/stores";
import { useConnections } from "@pages/Connections/useConnections.ts";
import { type RouteIds, useNavigate } from "@tanstack/react-router";
import { Result } from "better-result";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CommandMenuView } from "./CommandMenuView.tsx";
import { isEditableTarget, isInsidePopup, isPopupOpen } from "./keyTargets.ts";
import { useRegistryInput } from "./useRegistryInput.ts";

/** Paths a command may open: the router's registered routes. */
type AppRoutePath = RouteIds<typeof routeTree>;

/**
 * Compile-time guard: every path a command can open must be one of the
 * above, so a typo in the command registry fails the build.
 */
const routePath = <P extends AppRoutePath>(path: P): P => path;

/** Storage key shared with the previous palette (old ids are migrated). */
const PINNED_STORAGE_KEY = "pinnedCommandMenuGroups";

/** Pickers list more than the short browsing list, but stay bounded. */
const pickerLimits: GroupLimits = {
  browsing: { nodes: 50, commands: 50 },
  searching: { nodes: 50, commands: 50 },
};

/**
 * Global command menu (⌘K / Ctrl+K) and the G-then-letter shortcuts. The
 * menu's data hooks only mount while it is open.
 */
export const CommandPalette = () => {
  const open = useAppStore((s) => s.commandPaletteOpen);
  const setOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const navigate = useNavigate({ from: "/" });

  useEffect(() => {
    let chord = idleChord;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || event.repeat) {
        return;
      }
      if (isCommandMenuShortcut(event)) {
        event.preventDefault();
        chord = idleChord;
        setOpen(!useAppStore.getState().commandPaletteOpen);
        return;
      }
      if (event.defaultPrevented) {
        return;
      }
      const step = nextChord(
        chord,
        {
          key: event.key,
          metaKey: event.metaKey,
          ctrlKey: event.ctrlKey,
          altKey: event.altKey,
          editable:
            isEditableTarget(event.target) || isInsidePopup(event.target),
          blocked: isPopupOpen(document),
        },
        event.timeStamp,
      );
      chord = step.state;
      if (step.path) {
        event.preventDefault();
        void navigate({ to: routePath(step.path) });
      }
    };
    globalThis.addEventListener("keydown", onKeyDown);
    return () => globalThis.removeEventListener("keydown", onKeyDown);
  }, [setOpen, navigate]);

  return open ? <OpenCommandMenu onClose={() => setOpen(false)} /> : null;
};

/** The menu while it is up: fresh query, list and clock on every open. */
const OpenCommandMenu = ({ onClose }: { onClose: () => void }) => {
  const openConnections = useAppStore((s) => s.openConnections);
  const setSelectedDevice = useAppStore((s) => s.setSelectedDevice);
  const setNodeNumDetails = useAppStore((s) => s.setNodeNumDetails);
  const activeConnectionId = useDeviceStore((s) => s.activeConnectionId);
  const { disconnect } = useConnections();
  const { setDialogOpen } = useDevice();
  const connection = useActiveClient();
  const { toast } = useToast();
  const { t } = useTranslation("commandPalette");
  const navigate = useNavigate({ from: "/" });
  const [storedPins, setStoredPins] = useLocalStorage<string[]>(
    PINNED_STORAGE_KEY,
    [],
  );
  const pinned = useMemo(() => migratePinnedGroups(storedPins), [storedPins]);

  const [query, setQuery] = useState("");
  const [page, setPage] = useState<CommandPageId | null>(null);
  // Captured on open so "5 min ago" holds still while the menu is up.
  const [openedAt] = useState(() => Date.now());
  // The menu has no trigger element, so remember what had focus.
  const [returnFocusTo] = useState(() => document.activeElement);
  const input = useRegistryInput(openedAt);

  // Normalised once per data change; a keystroke only re-scores.
  const rootIndex = useMemo(() => indexCommands(buildRegistry(input)), [input]);
  const pinIndex = useMemo(
    () => indexCommands(pinCommands(t, pinned)),
    [t, pinned],
  );
  const pageIndex = useMemo(() => {
    switch (page) {
      case null:
        return null;
      case "traceroute":
        return indexCommands(nodeCommands(input));
      case "switchDevice":
        return indexCommands(deviceCommands(input));
    }
  }, [page, input]);

  const groups = useMemo(() => {
    const parsed = parseQuery(query);
    return pageIndex
      ? buildResults(pageIndex, parsed, { limits: pickerLimits })
      : buildResults([...rootIndex, ...pinIndex], parsed, { pinned });
  }, [query, pageIndex, rootIndex, pinIndex, pinned]);

  const showPage = (next: CommandPageId | null) => {
    setPage(next);
    setQuery("");
  };

  const runAction = (action: CommandAction) => {
    switch (action.type) {
      case "openPage":
        showPage(action.page);
        return;
      case "togglePin":
        setStoredPins(togglePinnedGroup(pinned, action.group));
        setQuery("");
        return;
      case "dialog":
        setDialogOpen(action.dialog, true);
        break;
      case "connectDevice":
        openConnections("add");
        break;
      case "disconnect": {
        // Through the connection manager, so the saved connection is
        // marked disconnected rather than lost.
        const done = activeConnectionId
          ? disconnect(activeConnectionId)
          : connection?.disconnect();
        void Promise.resolve(done).catch((error: unknown) => {
          console.error("Failed to disconnect:", error);
        });
        break;
      }
      case "enterDfuMode":
        void connection?.enterDfuMode();
        break;
      case "reconfigure":
        void connection?.rehandshake();
        break;
      case "switchDevice":
        setSelectedDevice(action.deviceId);
        break;
      default: {
        const unhandled: never = action;
        return unhandled;
      }
    }
    onClose();
  };

  const traceroute = (nodeNum: number) => {
    if (!connection) {
      toast({ title: t("toast.notConnected"), variant: "destructive" });
      return;
    }
    const failed = () =>
      toast({ title: t("toast.tracerouteFailed"), variant: "destructive" });
    toast({ title: t("toast.sendingTraceroute.title", { ns: "ui" }) });
    connection
      .traceRoute(nodeNum)
      .then((result) => {
        if (Result.isError(result)) {
          failed();
        } else {
          toast({ title: t("toast.tracerouteSent.title", { ns: "ui" }) });
        }
      })
      .catch(failed);
  };

  const run = (command: Command) => {
    switch (command.kind) {
      case "action":
        if (command.disabled === true) return;
        runAction(command.action);
        return;
      case "navigate":
        void navigate({
          to: routePath(command.target.to),
          search: command.target.search ?? {},
        });
        break;
      case "conversation": {
        const { target } = command;
        void navigate({
          to: routePath("/messages/$type/$chatId"),
          params:
            target.type === "broadcast"
              ? { type: "broadcast", chatId: String(target.channel) }
              : { type: "direct", chatId: String(target.nodeNum) },
        });
        break;
      }
      case "node":
        if (page === "traceroute") {
          traceroute(command.nodeNum);
        } else {
          setNodeNumDetails(command.nodeNum);
          setDialogOpen("nodeDetails", true);
        }
        break;
      default: {
        const unhandled: never = command;
        return unhandled;
      }
    }
    onClose();
  };

  return (
    <CommandMenuView
      open
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
      query={query}
      onQueryChange={setQuery}
      groups={groups}
      page={page}
      onBack={() => showPage(null)}
      pinned={pinned}
      onSelect={run}
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        // Leave focus alone if a command moved it (e.g. opened a dialog).
        const idle =
          document.activeElement === null ||
          document.activeElement === document.body;
        if (
          idle &&
          returnFocusTo instanceof HTMLElement &&
          returnFocusTo.isConnected
        ) {
          returnFocusTo.focus();
        }
      }}
    />
  );
};
