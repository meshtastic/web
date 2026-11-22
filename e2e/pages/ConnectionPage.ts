import { expect, type Page } from "@playwright/test";

/** localStorage flag the app sets once the welcome wizard is finished or skipped. */
const WELCOME_DISMISSED_KEY = "meshtastic.welcomeDismissed";

type HttpTarget = { host: string; tls: boolean; name?: string };

/**
 * Connects the app to a device over the HTTP(S) phone API, either through the
 * Connections drawer (the everyday path) or through the first-run welcome
 * wizard. Both end on /messages with the device card reporting "Connected".
 */
export class ConnectionPage {
  constructor(private readonly page: Page) {}

  /**
   * The device button in the app rail (desktop) or header (phone) is named
   * "Device <long name>, <status>".
   */
  deviceStatus() {
    return this.page.getByRole("button", { name: /^Device .*, Connected$/ });
  }

  /**
   * Adds and connects an HTTP connection from the Connections drawer. A fresh
   * browser is sent to the welcome wizard, so mark it seen first.
   */
  async connectHttp(opts: HttpTarget): Promise<void> {
    const { host, tls, name = "E2E Device" } = opts;
    const page = this.page;

    await page.addInitScript(
      (key) => localStorage.setItem(key, "1"),
      WELCOME_DISMISSED_KEY,
    );
    // /connections opens the drawer over the messages screen.
    await page.goto("/connections");

    const drawer = page.getByRole("dialog");
    await drawer.getByRole("button", { name: "Add connection" }).click();
    await expect(
      drawer.getByRole("heading", { name: "Add connection" }),
    ).toBeVisible();
    // HTTP is the default tab, but click it to be explicit/robust.
    await drawer.getByRole("tab", { name: "HTTP" }).click();

    await drawer.locator("#name-http").fill(name);
    await drawer.locator("#url").fill(host);

    const httpsSwitch = drawer.getByRole("switch");
    const isChecked =
      (await httpsSwitch.getAttribute("aria-checked")) === "true";
    if (tls !== isChecked) {
      await httpsSwitch.click();
    }

    await drawer.getByRole("button", { name: "Test connection" }).click();

    const save = drawer.getByRole("button", { name: "Save connection" });
    await expect(
      save,
      "Save enables only after the device is reachable",
    ).toBeEnabled({
      timeout: 20_000,
    });
    await save.click();

    // Saving closes the drawer, even while the radio is still connecting.
    await expect(drawer).toHaveCount(0);
    await expect(this.deviceStatus().first()).toBeVisible({ timeout: 60_000 });
    await expect(page).toHaveURL(/\/messages$/);
  }

  /**
   * Connects from the welcome wizard a fresh browser opens on, waits for the
   * sync to finish, then skips the remaining steps and opens the client.
   */
  async connectHttpThroughWelcome(opts: HttpTarget): Promise<void> {
    const { host, tls } = opts;
    const page = this.page;

    await page.goto("/");
    await expect(page).toHaveURL(/\/welcome$/);
    await page.getByRole("button", { name: "Get started" }).click();

    // The radio input is visually hidden; its card is the click target.
    await page.getByText("Wi-Fi (HTTP)", { exact: true }).click();
    await expect(
      page.getByRole("radio", { name: /^Wi-Fi \(HTTP\)/ }),
    ).toBeChecked();
    await page.getByLabel("Radio address").fill(host);
    const httpsSwitch = page.getByRole("switch");
    const isChecked =
      (await httpsSwitch.getAttribute("aria-checked")) === "true";
    if (tls !== isChecked) {
      await httpsSwitch.click();
    }
    await page.getByRole("button", { name: "Connect", exact: true }).click();

    await expect(
      page.getByRole("status").filter({ hasText: "ready" }),
    ).toBeVisible({ timeout: 60_000 });
    // Once a radio is connected, "Skip setup" jumps to the last step.
    await page.getByRole("button", { name: "Skip setup" }).click();
    await page.getByRole("button", { name: "Open web client" }).click();
    await expect(page).toHaveURL(/\/messages/);
  }
}
