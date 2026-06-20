import { type ChildProcess, spawn } from "node:child_process";
import path from "node:path";

/**
 * Thin TypeScript wrapper around e2e/peer/peer.py — the off-browser "mesh peer"
 * that talks to the non-browser node over the TCP phone API. It sends text,
 * blocks until a specific text is received, or reports the node's number.
 */
const PYTHON = process.env.E2E_PEER_PYTHON ?? path.resolve("e2e/peer/.venv/bin/python");
const SCRIPT = path.resolve("e2e/peer/peer.py");
const HOST = process.env.E2E_PEER_HOST ?? "127.0.0.1";
const PORT = process.env.E2E_PEER_PORT ?? "14404";

function spawnPeer(args: string[]): ChildProcess {
  return spawn(PYTHON, [SCRIPT, "--host", HOST, "--port", PORT, ...args]);
}

/** Invoke `onLine` for each complete stdout line. */
function onStdoutLines(child: ChildProcess, onLine: (line: string) => void): void {
  let buf = "";
  child.stdout?.on("data", (chunk: Buffer) => {
    buf += chunk.toString();
    let idx: number;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (line) onLine(line);
    }
  });
}

/** Send a text from the peer node. Broadcast unless `to` (a node number) is given. */
export function peerSend(
  text: string,
  opts: { to?: number; wantAck?: boolean } = {},
): Promise<void> {
  const args = ["send", text];
  if (opts.to != null) args.push("--to", String(opts.to));
  if (opts.wantAck) args.push("--want-ack");
  const child = spawnPeer(args);
  let stderr = "";
  child.stderr?.on("data", (d) => {
    stderr += d.toString();
  });
  return new Promise<void>((resolve, reject) => {
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`peer send exited ${code}: ${stderr.trim()}`)),
    );
    child.on("error", reject);
  });
}

/** Read the peer node's own node number. */
export function peerNodeNum(): Promise<number> {
  const child = spawnPeer(["node-num"]);
  let num: number | null = null;
  let stderr = "";
  child.stderr?.on("data", (d) => {
    stderr += d.toString();
  });
  onStdoutLines(child, (line) => {
    const m = line.match(/^NODE_NUM=(\d+)/);
    if (m) num = Number(m[1]);
  });
  return new Promise<number>((resolve, reject) => {
    child.on("exit", (code) =>
      num != null
        ? resolve(num)
        : reject(new Error(`peer node-num failed (${code}): ${stderr.trim()}`)),
    );
    child.on("error", reject);
  });
}

export type RecvHandle = {
  /** Resolves with the sender node number once the awaited text arrives. */
  received: Promise<number>;
  /** Kill the listener early. */
  stop: () => void;
};

/**
 * Start listening on the peer node for `text`. The returned promise resolves
 * once the listener is subscribed (so the caller can then trigger the browser
 * send without racing). The handle's `received` resolves when the text lands.
 */
export function startPeerRecv(
  text: string,
  opts: { fromNode?: number; timeout?: number } = {},
): Promise<RecvHandle> {
  const { fromNode, timeout = 60 } = opts;
  const args = ["recv", text, "--timeout", String(timeout)];
  if (fromNode != null) args.push("--from-node", String(fromNode));
  const child = spawnPeer(args);
  let stderr = "";
  child.stderr?.on("data", (d) => {
    stderr += d.toString();
  });

  let resolveReceived!: (n: number) => void;
  let rejectReceived!: (e: Error) => void;
  const received = new Promise<number>((res, rej) => {
    resolveReceived = res;
    rejectReceived = rej;
  });
  const handle: RecvHandle = { received, stop: () => child.kill() };

  return new Promise<RecvHandle>((resolveReady, rejectReady) => {
    let from: number | null = null;
    onStdoutLines(child, (line) => {
      if (line === "READY") resolveReady(handle);
      const m = line.match(/^RECEIVED=(\d+)/);
      if (m) from = Number(m[1]);
    });
    child.on("exit", (code) => {
      if (code === 0 && from != null) {
        resolveReceived(from);
      } else {
        const err = new Error(
          `peer recv exited ${code} (no match for "${text}"): ${stderr.trim()}`,
        );
        rejectReady(err);
        rejectReceived(err);
      }
    });
    child.on("error", (e) => {
      rejectReady(e);
      rejectReceived(e);
    });
  });
}
