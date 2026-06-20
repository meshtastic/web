import { test as base, expect } from "@playwright/test";
import { ConnectionPage } from "../pages/ConnectionPage.ts";
import { MessagesPage } from "../pages/MessagesPage.ts";

export type DeviceInfo = {
  /** host:port the browser connects to, e.g. "127.0.0.1:9443". */
  host: string;
  /** Whether the device webserver is HTTPS. */
  tls: boolean;
};

type Fixtures = {
  connectionPage: ConnectionPage;
  messagesPage: MessagesPage;
  device: DeviceInfo;
};

export const test = base.extend<Fixtures>({
  connectionPage: async ({ page }, use) => {
    await use(new ConnectionPage(page));
  },
  messagesPage: async ({ page }, use) => {
    await use(new MessagesPage(page));
  },
  // oxlint-disable-next-line no-empty-pattern -- Playwright fixture with no deps
  device: async ({}, use) => {
    const url = new URL(process.env.E2E_NODE_A_URL ?? "https://127.0.0.1:9443");
    await use({ host: url.host, tls: url.protocol === "https:" });
  },
});

export { expect };
