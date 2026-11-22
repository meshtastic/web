import { expect, type Locator, type Page } from "@playwright/test";

/** The Messages screen: conversation list, composer and rendered messages. */
export class MessagesPage {
  constructor(private readonly page: Page) {}

  /** The composer, labelled "Message <conversation>". */
  input(): Locator {
    return this.page.getByRole("textbox", { name: /^Message / });
  }

  sendButton(): Locator {
    return this.page.getByRole("button", { name: "Send", exact: true });
  }

  /** A rendered message (an <li>) containing the given text. */
  message(text: string): Locator {
    return this.page.getByRole("listitem").filter({ hasText: text });
  }

  /**
   * Opens a channel from the conversation list. Client-side navigation keeps
   * the live connection; a full reload would drop it.
   */
  async openChannel(index = 0): Promise<void> {
    await this.page
      .locator(`a[href="/messages/broadcast/${index}"]`)
      .first()
      .click();
    await expect(this.page).toHaveURL(
      new RegExp(`/messages/broadcast/${index}$`),
    );
  }

  /** Wait until the device is configured enough that the composer is usable. */
  async waitReady(): Promise<void> {
    await expect(this.input()).toBeVisible({ timeout: 60_000 });
    await expect(this.input()).toBeEnabled();
    // The SDK chat client lags the composer (device handshake + sqlocal init),
    // so an immediate send is silently dropped. Gate on the device reporting
    // "Connected".
    await expect(
      this.page.getByRole("button", { name: /^Device .*, Connected$/ }).first(),
    ).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Open a direct-message thread with a node from the "Heard recently" list on
   * the messages screen (client-side nav, so the live connection is kept).
   */
  async openDirectMessageByNodeNum(nodeNum: number): Promise<void> {
    await this.page
      .getByRole("link", { name: "Messages", exact: true })
      .click();
    await this.page
      .locator(`a[href="/messages/direct/${nodeNum >>> 0}"]`)
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
