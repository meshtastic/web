import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures/test.ts";

/**
 * Mobile responsiveness (meshtastic/web#666).
 *
 * Below the `md` breakpoint the app rail becomes a bottom tab bar, a
 * conversation takes the whole screen, and side panels open as sheets. These
 * checks assert the two things that actually break on a phone: the document
 * must never scroll sideways, and nothing that lived in a side column may
 * become unreachable.
 */
test.use({ viewport: { width: 390, height: 844 } });

/** Long-lived reminder toasts overlay the page; clear them before interacting. */
async function dismissToasts(page: Page) {
  const closers = page.locator("[toast-close]");
  for (let i = await closers.count(); i > 0; i = await closers.count()) {
    await closers.first().click();
    await expect(closers).toHaveCount(i - 1);
  }
}

/** The app itself must never scroll sideways, whatever a page puts inside it. */
async function expectNoHorizontalOverflow(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

const tabBar = (page: Page) => page.getByRole("navigation", { name: "App" });

test.describe("mobile layout", () => {
  test.beforeEach(async ({ page, connectionPage, device }) => {
    await connectionPage.connectHttp({ host: device.host, tls: device.tls });
    await dismissToasts(page);
  });

  test("reaches every section from the bottom tab bar", async ({ page }) => {
    await expectNoHorizontalOverflow(page);
    for (const [name, path] of [
      ["Nodes", "/nodes"],
      ["Map", "/map"],
      ["Settings", "/settings"],
      ["Chats", "/messages"],
    ] as const) {
      await tabBar(page).getByRole("link", { name, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expectNoHorizontalOverflow(page);
    }
  });

  test("a conversation takes the screen and Back returns to the list", async ({
    page,
    messagesPage,
  }) => {
    await messagesPage.openChannel(0);
    await expect(tabBar(page)).toBeHidden();

    await expect(messagesPage.input()).toBeVisible();
    await expect(messagesPage.sendButton()).toBeVisible();
    await messagesPage.input().fill("typed on a phone");
    await expectNoHorizontalOverflow(page);

    await page.getByRole("link", { name: "Back to chats" }).click();
    await expect(page).toHaveURL(/\/messages$/);
    await expect(tabBar(page)).toBeVisible();
  });

  test("opens channel details as a sheet", async ({ page, messagesPage }) => {
    await messagesPage.openChannel(0);
    await page.getByRole("button", { name: "Channel details" }).click();

    const sheet = page.getByRole("dialog", { name: "Channel details" });
    await expect(sheet).toBeVisible();
    await expect(
      sheet.getByRole("region", { name: "Recently heard" }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
  });

  test("keeps the nodes list inside the page width", async ({ page }) => {
    await tabBar(page)
      .getByRole("link", { name: "Nodes", exact: true })
      .click();
    const list = page.getByRole("list", { name: "Known nodes" });
    await expect(list).toBeVisible();
    await expect(list.getByRole("listitem").first()).toBeVisible();

    const { right } = await list.evaluate((el) => el.getBoundingClientRect());
    expect(right).toBeLessThanOrEqual(390);
    await expectNoHorizontalOverflow(page);
  });

  test("opens a settings section full screen", async ({ page }) => {
    await tabBar(page)
      .getByRole("link", { name: "Settings", exact: true })
      .click();
    await page.getByRole("button", { name: /^Device configuration/ }).click();

    await expect(page).toHaveURL(/\/settings\/device/);
    await expect(
      page.getByRole("heading", { name: "Device configuration", exact: true }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
