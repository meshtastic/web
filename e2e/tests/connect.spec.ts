import { expect, test } from "../fixtures/test.ts";

/**
 * T0 — the app can connect to a REAL device over the HTTP(S) phone API and
 * complete the config handshake far enough to show the messaging UI.
 */
test("connects to a real device over HTTPS and reaches the message view", async ({
  page,
  connectionPage,
  messagesPage,
  device,
}) => {
  await connectionPage.connectHttp({ host: device.host, tls: device.tls });
  await messagesPage.openChannel(0);
  await messagesPage.waitReady();
  await expect(page).toHaveURL(/\/messages\/broadcast\/0/);
});

test("connects from the first-run welcome wizard", async ({
  connectionPage,
  messagesPage,
  device,
}) => {
  await connectionPage.connectHttpThroughWelcome({
    host: device.host,
    tls: device.tls,
  });
  await expect(connectionPage.deviceStatus().first()).toBeVisible();
  await messagesPage.openChannel(0);
  await messagesPage.waitReady();
});
