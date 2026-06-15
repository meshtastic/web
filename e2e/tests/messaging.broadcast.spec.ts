import { peerSend, startPeerRecv } from "../fixtures/peer.ts";
import { expect, test } from "../fixtures/test.ts";

/**
 * Broadcast text messaging across a real two-node mesh:
 *  - mesh -> web: the peer node broadcasts; the browser must render it.
 *  - web -> mesh: the browser sends; the peer node must receive it.
 * Both directions traverse real firmware over the UDP-multicast mesh.
 */
test.describe("broadcast messaging over a real two-node mesh", () => {
  test.beforeEach(async ({ connectionPage, messagesPage, device }) => {
    await connectionPage.connectHttp({ host: device.host, tls: device.tls });
    await messagesPage.waitReady();
  });

  test("renders a broadcast received from a mesh peer (mesh -> web)", async ({ messagesPage }) => {
    const nonce = `pong-${Date.now()}`;
    await peerSend(nonce);
    await messagesPage.expectMessage(nonce);
  });

  test("delivers a typed broadcast to the mesh (web -> mesh)", async ({ messagesPage }) => {
    const nonce = `ping-${Date.now()}`;
    // Listen on the peer node before sending, then type+send from the browser.
    const recv = await startPeerRecv(nonce, { timeout: 60 });
    await messagesPage.send(nonce);
    // The peer node confirms the text actually traversed the real mesh.
    const from = await recv.received;
    expect(from).toBeGreaterThan(0);
  });
});
