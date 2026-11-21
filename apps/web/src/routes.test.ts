import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { useAppStore } from "@core/stores";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { routeTree } from "./routes.tsx";

const load = async (path: string) => {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
    context: { stores: {} as never, i18n: {} as never },
  });
  await router.load();
  return router;
};

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(path);
    }
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
      ? [path]
      : [];
  });

describe("routes", () => {
  beforeEach(() => {
    useAppStore.getState().closeConnections();
  });

  it("/connections redirects home and opens the Connections drawer", async () => {
    const router = await load("/connections");
    expect(router.state.location.pathname).toBe("/messages");
    expect(useAppStore.getState().connectionsDrawer).toEqual({
      open: true,
      view: "list",
    });
  });

  it("/ no longer renders the Connections page", async () => {
    const router = await load("/");
    expect(router.state.location.pathname).toBe("/messages");
    expect(useAppStore.getState().connectionsDrawer.open).toBe(false);
  });

  it("/messages stays on the conversation list instead of opening a channel", async () => {
    const router = await load("/messages");
    expect(router.state.location.pathname).toBe("/messages");
    expect(router.state.matches.at(-1)?.staticData.hideTabBar).toBeUndefined();
  });

  it("a conversation hides the mobile tab bar", async () => {
    const router = await load("/messages/direct/42");
    expect(router.state.matches.at(-1)?.staticData).toEqual({
      hideTabBar: true,
    });
  });

  it("opening and closing the drawer changes no route", async () => {
    const router = await load("/nodes");
    const before = router.state.location.href;
    useAppStore.getState().openConnections("add");
    useAppStore.getState().closeConnections();
    expect(router.state.location.href).toBe(before);
  });

  it("no in-app code navigates to /connections", () => {
    const offenders = sourceFiles(join(import.meta.dirname, ".")).filter(
      (file) =>
        !file.endsWith("routes.tsx") &&
        /to:\s*["'`]\/connections["'`]/.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it.each(["/settings/firmware", "/settings/help"])(
    "%s opens its settings section without the tab bar",
    async (path) => {
      const router = await load(path);
      expect(router.state.location.pathname).toBe(path);
      const leaf = router.state.matches.at(-1);
      expect(leaf?.routeId).toBe(path);
      expect(leaf?.staticData).toEqual({ hideTabBar: true });
    },
  );

  it("keeps ?tab= on device and module settings", async () => {
    const router = await load("/settings/device?tab=position");
    expect(router.state.location.search).toEqual({ tab: "position" });
  });

  it("/settings/radio redirects to LoRa", async () => {
    const router = await load("/settings/radio");
    expect(router.state.location.pathname).toBe("/settings/lora");
  });
});
