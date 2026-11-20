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
    expect(router.state.location.pathname).toBe("/messages/broadcast/0");
    expect(useAppStore.getState().connectionsDrawer).toEqual({
      open: true,
      view: "list",
    });
  });

  it("/ no longer renders the Connections page", async () => {
    const router = await load("/");
    expect(router.state.location.pathname).toBe("/messages/broadcast/0");
    expect(useAppStore.getState().connectionsDrawer.open).toBe(false);
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
});
