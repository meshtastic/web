#!/usr/bin/env node
/**
 * Postbuild step: renames tsdown's hashed `.d.ts` outputs back to their
 * canonical `mod.d.ts` / `transport.d.ts` / etc. names so package.json
 * `types` and consumer dts-bundlers can find them.
 *
 * tsdown emits `mod-<hash>.d.ts` (etc.) for multi-entry builds even with
 * `splitting: false`. The matching `.js` files come out unhashed — only
 * the dts side is affected. This script collapses them.
 */

import { readdirSync, renameSync, statSync } from "node:fs";
import { join } from "node:path";

const distDir = new URL("../dist", import.meta.url).pathname;

// Entry names declared in package.json's tsdown.entry. Internal chunk files
// (e.g. "Transport-<hash>.d.ts" with a capital T) are NOT entries and must
// stay hashed because mod.d.ts imports them by path.
const KNOWN_ENTRIES = ["mod", "transport", "protobuf", "testing"];

const files = readdirSync(distDir);
for (const f of files) {
  // Match `<entry>-<hash>.d.ts` where <entry> is one of the known entry names.
  const match = f.match(/^([A-Za-z]+)-[A-Za-z0-9_-]+\.d\.ts$/);
  if (!match) continue;
  const entry = match[1];
  if (!KNOWN_ENTRIES.includes(entry)) continue;

  const target = `${entry}.d.ts`;
  const src = join(distDir, f);
  const dst = join(distDir, target);

  // Skip if a canonical file already exists (e.g. the build emitted it directly).
  try {
    statSync(dst);
    continue;
  } catch {
    // expected — canonical file does not exist yet
  }

  renameSync(src, dst);
}
