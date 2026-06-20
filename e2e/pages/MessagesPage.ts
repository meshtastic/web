import { expect, type Locator, type Page } from "@playwright/test";

/** The Messages page: compose box + rendered message list. */
export class MessagesPage {
  constructor(private readonly page: Page) {}

  input(): Locator {
    return this.page.locator('input[name="messageInput"]');
  }

  sendButton(): Locator {
    return this.page.locator('form[name="messageInput"] button[type="submit"]');
  }

  /** A rendered message bubble (an <li>) containing the given text. */
  message(text: string): Locator {
    return this.page.getByRole("listitem").filter({ hasText: text });
  }

  /** Wait until the device is configured enough that the composer is usable. */
  async waitReady(): Promise<void> {
    await expect(this.input()).toBeVisible({ timeout: 60_000 });
    await expect(this.input()).toBeEnabled();
    // The SDK chat client lags the composer (device handshake + sqlocal init), so
    // an immediate send is silently dropped. Gate on the "Connected" status.
    await expect(this.page.getByText("Connected", { exact: true }).first()).toBeVisible({
      timeout: 30_000,
    });
  }

  /**
   * Open a direct-message thread by clicking the peer node in the sidebar
   * (client-side nav, so the live connection is preserved — a full reload would
   * drop it). The node's default short name is the last 4 hex digits of its
   * number, e.g. 0xccddee02 -> "ee02".
   */
  async openDirectMessageByNodeNum(nodeNum: number): Promise<void> {
    const shortName = (nodeNum >>> 0).toString(16).slice(-4);
    await this.page
      .getByRole("button", { name: new RegExp(shortName, "i") })
      .first()
      .click();
    await expect(this.input()).toBeVisible();
  }

  async send(text: string): Promise<void> {
    await this.input().fill(text);
    await this.sendButton().click();
  }

  async expectMessage(text: string, timeout = 45_000): Promise<void> {
    await expect(this.message(text).first()).toBeVisible({ timeout });
  }
}
