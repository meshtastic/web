import type {
  Connection,
  ConnectionType,
} from "@core/stores/deviceStore/types.ts";

/**
 * Whether another tab or app has the radio, and what to tell the user.
 *
 * Only a tab on this site can be detected for sure: the tab lock (see
 * core/tabLock.ts) hands the app to one tab at a time and lets the user take
 * it over. Tabs on another site or port, and other apps, are invisible to
 * the browser. They show up only as how a connect fails:
 *
 * - `busy`: the USB port refused to open because something else holds it.
 * - `interrupted`: the link opened, then dropped or stopped answering. Two
 *   clients sharing a Bluetooth link, an HTTP endpoint or (where the OS
 *   allows it) a USB port take each other's replies.
 *
 * The strings are i18n keys with their namespace, for any `t`.
 */
export type RadioInUse = "busy" | "interrupted";

export function radioInUse(
  errorKind: Connection["errorKind"],
): RadioInUse | undefined {
  return errorKind === "busy" || errorKind === "interrupted"
    ? errorKind
    : undefined;
}

export interface RadioInUseAdvice {
  readonly title: string;
  readonly intro: string;
  /** Most likely fix first. */
  readonly tips: readonly string[];
}

const CLOSE_OTHER_TABS = {
  serial: "connections:inUse.closeOtherTabs.serial",
  bluetooth: "connections:inUse.closeOtherTabs.bluetooth",
  http: "connections:inUse.closeOtherTabs.http",
} as const satisfies Record<ConnectionType, string>;

/** The tip to close other tabs and apps that use the radio over `type`. */
export function closeOtherTabsTip(type: ConnectionType): string {
  return CLOSE_OTHER_TABS[type];
}

export function radioInUseAdvice(
  inUse: RadioInUse,
  type: ConnectionType,
): RadioInUseAdvice {
  if (inUse === "busy") {
    return {
      title: "connections:inUse.busy.title",
      intro: "connections:inUse.busy.intro",
      tips: [
        closeOtherTabsTip(type),
        "connections:inUse.quitApps",
        "connections:inUse.retry",
      ],
    };
  }
  return {
    title: "connections:inUse.interrupted.title",
    intro: "connections:inUse.interrupted.intro",
    tips: [closeOtherTabsTip(type)],
  };
}

/**
 * The tab takeover screen's copy. Taking over reaches only tabs on this
 * site, so it also says what it can't reach.
 */
export const TAB_TAKEOVER = {
  title: "ui:tabLock.title",
  description: "ui:tabLock.description",
  elsewhere: "connections:inUse.elsewhere",
  useHere: "ui:tabLock.useHere",
  claiming: "ui:tabLock.claiming",
} as const;
