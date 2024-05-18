import { expect, test } from "@playwright/test";

test("Basic page load", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Meshtastic Web");
});

test("Prompts adding a new connection as the call to action when there are no devices", async ({page}) => {
  await page.goto("/");

  await expect(page).toHaveScreenshot();

  await expect(page.getByRole("heading", { name: "No Devices" })).toBeVisible();
  await expect(page.getByRole("button", { name: "New Connection" })).toBeVisible();
});

test("Shows the protocols as the first step of adding a device", async ({page}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New Connection" }).click();
  await expect(page.getByRole("heading", { name: "Connect New Device" })).toBeVisible();
  await expect(page).toHaveScreenshot();
});

test("Requests the IP address or hostname as input when connecting over HTTP", async ({page}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New Connection" }).click();
  await page.getByRole("tab", { name: "HTTP" }).click();
  await expect(page.getByRole('dialog')).toHaveScreenshot('connect-over-http.png');
});

test("New Device button for the brower's dialog UI is presented when connecting over serial", async ({page}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New Connection" }).click();
  await page.getByRole("tab", { name: "Serial" }).click();
  await expect(page.getByRole("button", { name: "New Device" })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveScreenshot('connect-over-serial.png');
});
