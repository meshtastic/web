/**
 * Top-level app destinations shown in the desktop rail and the mobile tab
 * bar, and how the current path maps onto them. Pure: no router access.
 */

export const navDestinations = [
  "messages",
  "nodes",
  "map",
  "settings",
] as const;

export type NavDestination = (typeof navDestinations)[number];

export const navPaths = {
  messages: "/messages",
  nodes: "/nodes",
  map: "/map",
  settings: "/settings",
} as const satisfies Record<NavDestination, `/${NavDestination}`>;

export type NavPath = (typeof navPaths)[NavDestination];

/** Destinations above the rail spacer. Settings sits at the bottom. */
export const railPrimaryDestinations = [
  "messages",
  "nodes",
  "map",
] as const satisfies readonly NavDestination[];

/** Mobile bottom tabs, in order. */
export const tabBarDestinations = navDestinations;

/** True when `pathname` is the destination's root or anything below it. */
export const isInDestination = (
  pathname: string,
  destination: NavDestination,
): boolean => {
  const root = navPaths[destination];
  return pathname === root || pathname.startsWith(`${root}/`);
};

/** The destination the current path belongs to, if any. */
export const activeDestination = (
  pathname: string,
): NavDestination | undefined =>
  navDestinations.find((destination) => isInDestination(pathname, destination));

/** Nodes other than the connected radio itself. */
export const remoteNodeCount = (totalNodes: number): number =>
  Math.max(totalNodes - 1, 0);

/** Route `staticData` a screen can set to hide the mobile tab bar. */
export interface TabBarStaticData {
  readonly hideTabBar?: boolean;
}

/** Hide the tab bar when any matched route (e.g. a thread view) asks to. */
export const shouldHideTabBar = (
  matches: ReadonlyArray<{ readonly staticData?: TabBarStaticData }>,
): boolean => matches.some((match) => match.staticData?.hideTabBar === true);
