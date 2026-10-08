import { expect, test } from "../fixtures/test.ts";

/**
 * Mobile responsiveness (meshtastic/web#666).
 *
 * Below the `md` breakpoint the side bars stop being columns and are reached
 * from the header instead. These checks assert the two things that actually
 * break on a phone: the document must never scroll sideways, and nothing that
 * lived in a side bar may become unreachable.
 */
test.use({ viewport: { width: 390, height: 844 } });

/** Long-lived reminder toasts overlay the page; clear them before interacting. */
async function dismissToasts(page: import("@playwright/test").Page) {
  const closers = page.locator("[toast-close]");
  for (let i = await closers.count(); i > 0; i = await closers.count()) {
    await closers.first().click();
    await expect(closers).toHaveCount(i - 1);
  }
}

/** The app itself must never scroll sideways, whatever a page puts inside it. */
async function expectNoHorizontalOverflow(
  page: import("@playwright/test").Page,
) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

test.describe("mobile layout", () => {
  test.beforeEach(async ({ page, connectionPage, device }) => {
    await connectionPage.connectHttp({ host: device.host, tls: device.tls });
    await expect(page.locator('input[name="messageInput"]')).toBeVisible({
      timeout: 60_000,
    });
    await dismissToasts(page);
  });

  test("reaches navigation and device info through the header drawer", async ({
    page,
  }) => {
    await expectNoHorizontalOverflow(page);
    // The sidebar is not taking page width...
    await expect(page.getByRole("button", { name: "Map" })).toBeHidden();

    await page.getByRole("button", { name: "Navigation" }).click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    // ...but everything it carries is still reachable.
    await expect(drawer.getByRole("button", { name: "Map" })).toBeVisible();
    await expect(
      drawer.getByRole("button", { name: "Settings" }),
    ).toBeVisible();
    await expect(drawer.getByText("Connected", { exact: true })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
  });

  test("navigating from the drawer closes it and shows the page", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Navigation" }).click();
    await page
      .getByRole("button", { name: /^Nodes \(/ })
      .first()
      .click();

    await expect(page).toHaveURL(/\/nodes/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test("keeps the wide nodes table inside its own scroll region", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Navigation" }).click();
    await page
      .getByRole("button", { name: /^Nodes \(/ })
      .first()
      .click();
    await expect(page.getByRole("table")).toBeVisible();

    // The table is wider than the phone and scrolls — the document does not.
    const region = page.getByRole("table").locator("xpath=..");
    const { scrollWidth, clientWidth } = await region.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));
    expect(scrollWidth).toBeGreaterThan(clientWidth);
    await expectNoHorizontalOverflow(page);
  });

  test("keeps the composer usable and the node panel reachable", async ({
    page,
    messagesPage,
  }) => {
    await expect(messagesPage.input()).toBeVisible();
    await expect(messagesPage.sendButton()).toBeVisible();
    await messagesPage.input().fill("typed on a phone");
    await expectNoHorizontalOverflow(page);

    await page.getByRole("button", { name: "Nodes", exact: true }).click();
    const panel = page.getByRole("dialog");
    await expect(panel).toBeVisible();
    await expect(panel.getByPlaceholder("Search nodes...")).toBeVisible();
  });

  test("keeps the settings tab strip on one scrollable row", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Navigation" }).click();
    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByRole("button", { name: "Navigation" }).click();
    await page.getByRole("button", { name: "Module Config" }).click();

    const list = page.getByRole("tablist").first();
    await expect(list).toBeVisible();
    const { scrollWidth, clientWidth, height } = await list.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      height: el.getBoundingClientRect().height,
    }));
    // One row that scrolls, not a wrapped block filling the screen.
    expect(scrollWidth).toBeGreaterThan(clientWidth);
    expect(height).toBeLessThan(80);
    await expectNoHorizontalOverflow(page);
  });
});
