import { expect, type Page } from "@playwright/test";

/**
 * Drives the "Add Connection" dialog to connect to a device over the HTTP(S)
 * phone API. The dialog defaults to the HTTP tab; "Save connection" only enables
 * after a successful "Test connection". On success the app navigates to
 * /messages/broadcast/0.
 */
export class ConnectionPage {
  constructor(private readonly page: Page) {}

  async connectHttp(opts: { host: string; tls: boolean; name?: string }): Promise<void> {
    const { host, tls, name = "E2E Device" } = opts;
    const page = this.page;

    await page.goto("/");
    await page.getByRole("button", { name: "Add Connection" }).first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // HTTP is the default tab, but click it to be explicit/robust.
    await dialog.getByRole("tab", { name: "HTTP" }).click();

    await dialog.locator("#name-http").fill(name);
    await dialog.locator("#url").fill(host);

    const httpsSwitch = dialog.getByRole("switch");
    const isChecked = (await httpsSwitch.getAttribute("aria-checked")) === "true";
    if (tls !== isChecked) {
      await httpsSwitch.click();
    }

    await dialog.getByRole("button", { name: "Test connection" }).click();

    const save = dialog.getByRole("button", { name: "Save connection" });
    await expect(save, "Save enables only after the device is reachable").toBeEnabled({
      timeout: 20_000,
    });
    await save.click();

    await expect(page).toHaveURL(/\/messages\/broadcast\/0/, { timeout: 60_000 });
  }
}
