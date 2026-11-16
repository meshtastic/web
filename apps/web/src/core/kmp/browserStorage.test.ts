import { describe, expect, it } from "vitest";
import { sqliteWorkerUrl } from "./browserStorage.ts";

describe("sqliteWorkerUrl", () => {
  it("keeps the dev worker query and appends the db file", () => {
    expect(
      sqliteWorkerUrl(
        "/src/core/kmp/sqliteWorker.ts?worker_file&type=module",
        "ab12.db",
        "http://localhost:3000/x",
      ),
    ).toBe(
      "http://localhost:3000/src/core/kmp/sqliteWorker.ts?worker_file&type=module&db=ab12.db",
    );
  });

  it("encodes the db file for a production worker asset", () => {
    expect(
      sqliteWorkerUrl(
        "/assets/sqliteWorker-Hx1.js",
        ":memory:",
        "https://client.meshtastic.org/",
      ),
    ).toBe(
      "https://client.meshtastic.org/assets/sqliteWorker-Hx1.js?db=%3Amemory%3A",
    );
  });
});
