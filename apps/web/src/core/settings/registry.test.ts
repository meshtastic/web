import { describe, expect, it } from "vitest";
import {
  firmwareFlasherUrl,
  GROUP_LABEL_KEYS,
  isSettingsSectionId,
  moduleDocsUrl,
  SETTINGS_GROUP_IDS,
  SETTINGS_SECTION_IDS,
  SETTINGS_SECTIONS,
  sectionFromPath,
} from "./registry.ts";

describe("settings registry", () => {
  it("lists every section once, in the sidebar's group order", () => {
    expect(SETTINGS_SECTIONS.map((s) => s.id)).toEqual([
      ...SETTINGS_SECTION_IDS,
    ]);
    const groupOrder = SETTINGS_SECTIONS.map((s) =>
      SETTINGS_GROUP_IDS.indexOf(s.group),
    );
    expect(groupOrder).toEqual([...groupOrder].sort((a, b) => a - b));
  });

  it("mirrors Android's groups", () => {
    const byGroup = Object.fromEntries(
      SETTINGS_GROUP_IDS.map((group) => [
        group,
        SETTINGS_SECTIONS.filter((s) => s.group === group).map((s) => s.id),
      ]),
    );
    expect(byGroup).toEqual({
      configuration: [
        "user",
        "lora",
        "channels",
        "security",
        "device",
        "module",
        "administration",
      ],
      backupRestore: ["backup"],
      advanced: ["firmware", "clean-nodes", "debug"],
      app: ["app", "message-filter"],
      information: ["about", "help"],
    });
    expect(Object.keys(GROUP_LABEL_KEYS)).toEqual([...SETTINGS_GROUP_IDS]);
  });

  it("points docs links at meshtastic.org", () => {
    for (const section of SETTINGS_SECTIONS) {
      if ("docsUrl" in section) {
        expect(section.docsUrl).toMatch(/^https:\/\/meshtastic\.org\/docs\//);
      }
    }
  });

  it("only App settings and the message filter are stored in the browser", () => {
    expect(
      SETTINGS_SECTIONS.filter((s) => s.scope === "browser").map((s) => s.id),
    ).toEqual(["app", "message-filter"]);
  });

  it("reads the section from the path, keeping the old segments", () => {
    expect(sectionFromPath("/settings")).toBeUndefined();
    expect(sectionFromPath("/settings/clean-nodes")).toBe("clean-nodes");
    expect(sectionFromPath("/settings/module")).toBe("module");
    expect(sectionFromPath("/settings/nope")).toBeUndefined();
    expect(isSettingsSectionId("help")).toBe(true);
  });

  it("falls back to the module index for modules without a page", () => {
    expect(moduleDocsUrl("mqtt")).toBe(
      "https://meshtastic.org/docs/configuration/module/mqtt/",
    );
    expect(moduleDocsUrl("tak")).toBe(
      "https://meshtastic.org/docs/configuration/module/",
    );
  });

  it("preselects the radio's hardware model in the flasher link", () => {
    expect(firmwareFlasherUrl(110)).toBe(
      "https://flasher.meshtastic.org/?hwModel=110",
    );
    expect(firmwareFlasherUrl()).toBe("https://flasher.meshtastic.org");
  });
});
