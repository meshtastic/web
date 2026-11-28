import { Result } from "better-result";
import { describe, expect, it } from "vitest";
import {
  compareVersions,
  createNotice,
  latestStableRelease,
  MAX_NOTIFICATION_KEYS,
  type NoticeInputs,
  notificationKey,
  orderManifestUrls,
  parseHardwareCatalogue,
  parseManifestTargets,
  parseStableReleases,
  parseVersion,
  recordNotificationKey,
  releaseManifestUrls,
  resolveHardwareTarget,
  shouldNotify,
} from "./updateCheck.ts";

const version = (value: string) => {
  const parsed = parseVersion(value);
  if (!parsed) throw new Error(`unparsed ${value}`);
  return parsed;
};

const eligible: NoticeInputs = {
  nodeIdentity: "!1234abcd",
  currentVersion: "2.7.15.567b8ea",
  stableVersion: "v2.7.26.54e0d8d",
  hardwareTarget: "heltec-v4",
  releaseTargets: new Set(["rak4631", "heltec-v4"]),
};

describe("parseVersion", () => {
  it("reads release tags and radio versions, with or without a hash", () => {
    expect(version("v2.7.26.54e0d8d").normalized).toBe("2.7.26");
    expect(version("2.7.26").normalized).toBe("2.7.26");
    expect(version(" 2.8.1-rc1 ").normalized).toBe("2.8.1");
  });

  it("rejects anything that isn't major.minor.patch", () => {
    for (const bad of ["", "2.7", "2.7.x", "latest", "2.7.26junk", "x2.7.26"]) {
      expect(parseVersion(bad)).toBeUndefined();
    }
  });

  it("orders by number, ignoring the build hash", () => {
    expect(
      compareVersions(version("2.7.9.aaaaaaa"), version("2.7.10.0000000")),
    ).toBeLessThan(0);
    expect(
      compareVersions(version("2.7.26.54e0d8d"), version("v2.7.26.ffffff0")),
    ).toBe(0);
    expect(
      compareVersions(version("3.0.0"), version("2.99.99")),
    ).toBeGreaterThan(0);
  });
});

describe("parseStableReleases / latestStableRelease", () => {
  const list = {
    releases: {
      stable: [
        { id: "v2.7.15.567b8ea", title: "Beta" },
        { id: "v2.7.26.54e0d8d", title: "Beta" },
        { id: "not-a-version" },
        { title: "no id" },
      ],
      alpha: [{ id: "v2.8.2.d5f1619" }],
    },
    pullRequests: [{ id: "v9.9.9.pr" }],
  };

  it("keeps only the stable channel and picks the newest by version", () => {
    const parsed = parseStableReleases(list);
    expect(Result.isOk(parsed)).toBe(true);
    if (!Result.isOk(parsed)) return;
    expect(parsed.value.map((r) => r.id)).toEqual([
      "v2.7.15.567b8ea",
      "v2.7.26.54e0d8d",
      "not-a-version",
    ]);
    // List order is not trusted; alpha 2.8.2 is never offered.
    expect(latestStableRelease(parsed.value)?.id).toBe("v2.7.26.54e0d8d");
  });

  it("rejects a list without a stable channel", () => {
    expect(Result.isError(parseStableReleases({ releases: {} }))).toBe(true);
    expect(Result.isError(parseStableReleases(null))).toBe(true);
  });

  it("has no latest when nothing parses", () => {
    expect(latestStableRelease([{ id: "nope" }])).toBeUndefined();
    expect(latestStableRelease([])).toBeUndefined();
  });
});

describe("hardware support", () => {
  const catalogue = Result.unwrap(
    parseHardwareCatalogue([
      { hwModel: 110, platformioTarget: "heltec-v4" },
      { hwModel: 9, platformioTarget: "rak4631" },
      { hwModel: 9, platformioTarget: "rak4631_eth_gw" },
      { hwModel: 50, platformioTarget: "" },
      { hwModel: "bad", platformioTarget: "x" },
    ]),
  );

  it("drops rows without a model number or target", () => {
    expect(catalogue).toHaveLength(3);
    expect(Result.isError(parseHardwareCatalogue({}))).toBe(true);
  });

  it("resolves the target by model, disambiguated by the radio's pio_env", () => {
    expect(resolveHardwareTarget(catalogue, 110, undefined)).toBe("heltec-v4");
    expect(resolveHardwareTarget(catalogue, 9, "rak4631_eth_gw")).toBe(
      "rak4631_eth_gw",
    );
    expect(resolveHardwareTarget(catalogue, 9, "RAK4631_ETH_GW")).toBe(
      "rak4631_eth_gw",
    );
    // Unknown env: the model's first entry, as Android does.
    expect(resolveHardwareTarget(catalogue, 9, "other")).toBe("rak4631");
    expect(resolveHardwareTarget(catalogue, 9, undefined)).toBe("rak4631");
  });

  it("falls back to the pio_env when the model is unknown", () => {
    expect(resolveHardwareTarget(catalogue, 999, "heltec-v4")).toBe(
      "heltec-v4",
    );
    expect(resolveHardwareTarget(catalogue, 999, "unknown")).toBeUndefined();
    expect(resolveHardwareTarget(catalogue, undefined, undefined)).toBe(
      undefined,
    );
  });

  it("reads the boards a manifest declares", () => {
    const targets = parseManifestTargets({
      version: "2.7.26.54e0d8d",
      targets: [
        { board: "heltec-v4", platform: "esp32s3" },
        { board: " " },
        { platform: "nrf52" },
      ],
    });
    expect(Result.isOk(targets) && [...targets.value]).toEqual(["heltec-v4"]);
    expect(Result.isError(parseManifestTargets({ version: "x" }))).toBe(true);
  });

  it("points at the release's manifest, then its mirror", () => {
    expect(releaseManifestUrls({ id: "v2.7.26.54e0d8d" })).toEqual([
      "https://release.meshtastic.org/2.7.26.54e0d8d/firmware-2.7.26.54e0d8d.json",
      "https://meshtastic.github.io/firmware-2.7.26.54e0d8d/firmware-2.7.26.54e0d8d.json",
    ]);
    expect(releaseManifestUrls({ id: "v2.7.26/../x" })).toEqual([]);
    expect(releaseManifestUrls({ id: "latest" })).toEqual([]);
  });

  it("orders the copies by host, preferring the one that answered", () => {
    const urls = ["release", "mirror"];
    expect(orderManifestUrls(urls, "client.meshtastic.org")).toEqual(urls);
    expect(orderManifestUrls(urls, "meshtastic.org")).toEqual(urls);
    expect(orderManifestUrls(urls, "localhost")).toEqual(["mirror", "release"]);
    expect(orderManifestUrls(urls, "evilmeshtastic.org")).toEqual([
      "mirror",
      "release",
    ]);
    expect(orderManifestUrls(urls, undefined)).toEqual(["mirror", "release"]);
    expect(orderManifestUrls(urls, "client.meshtastic.org", "mirror")).toEqual([
      "mirror",
      "release",
    ]);
  });
});

describe("createNotice", () => {
  it("nudges an older radio on supported hardware", () => {
    expect(createNotice(eligible)).toEqual({
      notificationKey: "firmware-update-notified:!1234abcd:heltec-v4:2.7.26",
      currentVersion: "2.7.15",
      stableVersion: "2.7.26",
      hardwareTarget: "heltec-v4",
      destination: "meshtasticFlasher",
    });
  });

  it("matches the hardware target case-insensitively", () => {
    expect(
      createNotice({ ...eligible, releaseTargets: new Set(["HELTEC-V4"]) }),
    ).toBeDefined();
  });

  it("says nothing for an equal version with a different hash", () => {
    expect(
      createNotice({ ...eligible, currentVersion: "2.7.26.0000000" }),
    ).toBeUndefined();
  });

  it("says nothing for a newer radio, such as an alpha build", () => {
    expect(
      createNotice({ ...eligible, currentVersion: "2.8.2.d5f1619" }),
    ).toBeUndefined();
  });

  it("fails closed on anything unknown or malformed", () => {
    const cases: Partial<NoticeInputs>[] = [
      { currentVersion: undefined },
      { currentVersion: "" },
      { currentVersion: "garbage" },
      { stableVersion: undefined },
      { stableVersion: "latest" },
      { nodeIdentity: undefined },
      { nodeIdentity: "  " },
      { hardwareTarget: undefined },
      { hardwareTarget: "tbeam" },
      { releaseTargets: new Set() },
    ];
    for (const override of cases) {
      expect(createNotice({ ...eligible, ...override })).toBeUndefined();
    }
  });
});

describe("dedupe", () => {
  it("keys on node, hardware and normalized stable version", () => {
    expect(notificationKey("!1234abcd", "heltec-v4", "v2.7.26.54e0d8d")).toBe(
      notificationKey("!1234abcd", "heltec-v4", "2.7.26"),
    );
    expect(notificationKey("!1234abcd", "heltec-v4", "2.7.26")).not.toBe(
      notificationKey("!1234abcd", "heltec-v4", "2.7.27"),
    );
    expect(notificationKey("!1234abcd", "heltec-v4", "2.7.26")).not.toBe(
      notificationKey("!99990000", "heltec-v4", "2.7.26"),
    );
  });

  it("notifies once per key and again for a later stable release", () => {
    const first = createNotice(eligible)?.notificationKey ?? "";
    expect(shouldNotify(first, [])).toBe(true);
    const shown = recordNotificationKey([], first);
    expect(shouldNotify(first, shown)).toBe(false);
    const later =
      createNotice({ ...eligible, stableVersion: "v2.7.27.abcdef0" })
        ?.notificationKey ?? "";
    expect(shouldNotify(later, shown)).toBe(true);
  });

  it("keeps the newest keys only", () => {
    let keys: string[] = [];
    for (let i = 0; i < MAX_NOTIFICATION_KEYS + 5; i++) {
      keys = recordNotificationKey(keys, `k${i}`);
    }
    keys = recordNotificationKey(keys, "k10");
    expect(keys).toHaveLength(MAX_NOTIFICATION_KEYS);
    expect(keys[0]).toBe("k5");
    expect(keys.at(-1)).toBe("k10");
  });
});
