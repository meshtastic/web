#!/usr/bin/env python3
"""Standalone Meshtastic test peer for the web E2E suite.

Connects to a `meshtasticd` node over the TCP phone API and either sends a text
message, blocks until a specific text is received, or prints the node's own
number. It mirrors the `wait_for(predicate, timeout)` + `send_text` conventions
from `firmware/mcp-server/tests/mesh/_receive.py`, but uses `TCPInterface` so it
can talk to a daemon (that `ReceiveCollector` is serial-only).

Machine-readable stdout markers (everything else goes to stderr):
  - `node-num`  -> `NODE_NUM=<n>`
  - `recv`      -> `READY` once subscribed, then `RECEIVED=<from>` on match

Exit codes: 0 success, 1 timeout / not received, 2 usage / connection error.

Usage:
  peer.py --host localhost --port 4404 send "hello" [--to <nodenum>] [--want-ack]
  peer.py --host localhost --port 4403 recv "hello" [--from-node <n>] [--timeout 60]
  peer.py --host localhost --port 4404 node-num
"""

from __future__ import annotations

import argparse
import sys
import threading
import time

import meshtastic
import meshtastic.tcp_interface
from pubsub import pub


def log(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


def emit(msg: str) -> None:
    print(msg, flush=True)


def connect(host: str, port: int, timeout: float):
    log(f"[peer] connecting to {host}:{port} ...")
    iface = meshtastic.tcp_interface.TCPInterface(hostname=host, portNumber=port, connectNow=True)
    deadline = time.monotonic() + timeout
    while getattr(iface, "myInfo", None) is None and time.monotonic() < deadline:
        time.sleep(0.1)
    if getattr(iface, "myInfo", None) is None:
        raise TimeoutError(f"no myInfo from {host}:{port} within {timeout}s")
    log(f"[peer] connected as node {iface.myInfo.my_node_num}")
    return iface


def cmd_node_num(args) -> int:
    iface = connect(args.host, args.port, args.connect_timeout)
    try:
        emit(f"NODE_NUM={iface.myInfo.my_node_num}")
        return 0
    finally:
        iface.close()


def cmd_send(args) -> int:
    iface = connect(args.host, args.port, args.connect_timeout)
    try:
        dest = args.to if args.to is not None else meshtastic.BROADCAST_ADDR
        pkt = iface.sendText(args.text, destinationId=dest, wantAck=args.want_ack)
        pid = getattr(pkt, "id", None)
        log(f"[peer] sent {args.text!r} -> {dest} (id={pid}) from {iface.myInfo.my_node_num}")
        # Let the TX flush over UDP multicast before we disconnect.
        time.sleep(args.linger)
        emit(f"SENT={pid}")
        return 0
    finally:
        iface.close()


def cmd_recv(args) -> int:
    iface = connect(args.host, args.port, args.connect_timeout)
    found = threading.Event()
    hit: dict = {}

    def on_text(packet, interface=None):  # noqa: ANN001
        decoded = (packet or {}).get("decoded", {}) or {}
        if decoded.get("text") != args.text:
            return
        frm = packet.get("from")
        if args.from_node is not None and frm != args.from_node:
            return
        hit["from"] = frm
        found.set()

    pub.subscribe(on_text, "meshtastic.receive.text")
    log(f"[peer] listening for {args.text!r} on node {iface.myInfo.my_node_num} (timeout {args.timeout}s)")
    emit("READY")  # the test waits for this before driving the browser send
    try:
        if found.wait(timeout=args.timeout):
            emit(f"RECEIVED={hit.get('from')}")
            log(f"[peer] received {args.text!r} from {hit.get('from')}")
            return 0
        log(f"[peer] TIMEOUT waiting for {args.text!r}")
        return 1
    finally:
        pub.unsubscribe(on_text, "meshtastic.receive.text")
        iface.close()


def main() -> int:
    ap = argparse.ArgumentParser(description="Meshtastic E2E test peer (TCP)")
    ap.add_argument("--host", default="localhost")
    ap.add_argument("--port", type=int, default=4403)
    ap.add_argument("--connect-timeout", type=float, default=45.0)
    sub = ap.add_subparsers(dest="mode", required=True)

    s = sub.add_parser("send", help="send a text message")
    s.add_argument("text")
    s.add_argument("--to", type=int, default=None, help="destination node num (default: broadcast)")
    s.add_argument("--want-ack", action="store_true")
    s.add_argument("--linger", type=float, default=2.0)
    s.set_defaults(func=cmd_send)

    r = sub.add_parser("recv", help="wait for a specific text")
    r.add_argument("text")
    r.add_argument("--from-node", type=int, default=None)
    r.add_argument("--timeout", type=float, default=60.0)
    r.set_defaults(func=cmd_recv)

    n = sub.add_parser("node-num", help="print this node's number")
    n.set_defaults(func=cmd_node_num)

    args = ap.parse_args()
    try:
        return args.func(args)
    except Exception as exc:  # noqa: BLE001
        log(f"[peer] ERROR: {exc}")
        return 2


if __name__ == "__main__":
    sys.exit(main())
