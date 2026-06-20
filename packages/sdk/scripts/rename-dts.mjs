#!/usr/bin/env node
/**
 * Postbuild step that fixes three tsdown dts emitter glitches:
 *
 * 1. Renames hashed entry-point dts outputs (e.g. `mod-<hash>.d.ts`) to
 *    their canonical names. tsdown emits hashes for multi-entry builds
 *    even with `splitting: false`.
 *
 * 2. Inlines internal chunk dts files (e.g. `Transport-<hash>.d.ts`) into
 *    each entry-point dts. Downstream dts bundlers (rolldown) can't follow
 *    cross-chunk re-exports — they read the entry dts only and report
 *    "Missing export" for any identifier originally declared in a chunk.
 *    Inlining the chunk content + rewriting the import-letter aliases
 *    (`i as Transport`) produces a self-contained entry dts.
 *
 * 3. Patches `mod.d.ts` to declare the synthetic namespace identifiers
 *    that tsdown references but never defines. The `export * as Types
 *    from "..."` and `export * as Utils from "..."` patterns in mod.ts
 *    end up in the dist as `<wrapper>_d_exports as Types` re-exports
 *    without an accompanying `declare namespace ...` block.
 */

import {
  existsSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const distDir = new URL("../dist", import.meta.url).pathname;

const KNOWN_ENTRIES = ["mod", "transport", "protobuf", "testing"];

const TYPES_MEMBERS = {
  values: ["ChannelNumber", "DeviceStatusEnum", "Emitter", "EmitterScope"],
  types: [
    "Destination",
    "DeviceOutput",
    "HttpRetryConfig",
    "LogEvent",
    "LogEventPacket",
    "PacketDestination",
    "PacketError",
    "PacketMetadata",
    "QueueItem",
    "Transport",
  ],
};

const UTILS_MEMBERS = {
  values: ["EventBus", "Queue", "Xmodem", "fromDeviceStream", "toDeviceStream"],
  types: [],
  aliases: { EventSystem: "EventBus" },
};

function renameEntries() {
  const files = readdirSync(distDir);
  for (const f of files) {
    const match = f.match(/^([A-Za-z]+)-[A-Za-z0-9_-]+\.d\.ts$/);
    if (!match) continue;
    const entry = match[1];
    if (!KNOWN_ENTRIES.includes(entry)) continue;

    const target = `${entry}.d.ts`;
    const src = join(distDir, f);
    const dst = join(distDir, target);

    try {
      statSync(dst);
      continue;
    } catch {
      // canonical file doesn't exist — go ahead
    }
    renameSync(src, dst);
  }
}

// Match: import { i as Transport, n as DeviceStatusEnum, ... } from "./Foo-hash.js";
const CHUNK_IMPORT_RE =
  /^import\s*\{([^}]+)\}\s*from\s*"\.\/([A-Za-z]+-[A-Za-z0-9_-]+)\.js";\s*$/m;

function inlineChunks(entryPath) {
  if (!existsSync(entryPath)) return;
  let body = readFileSync(entryPath, "utf8");
  const seen = new Set();

  while (true) {
    const match = body.match(CHUNK_IMPORT_RE);
    if (!match) break;
    const [importLine, names, chunkBase] = match;
    const chunkPath = join(distDir, `${chunkBase}.d.ts`);
    if (!existsSync(chunkPath)) {
      // Strip the import to avoid infinite loop
      body = body.replace(importLine, "");
      continue;
    }
    seen.add(chunkPath);

    let chunkBody = readFileSync(chunkPath, "utf8");

    // The chunk ends with: export { Transport as i, DeviceStatusEnum as n, ... };
    // Parse the export aliases so we can rewrite the entry's import bindings.
    const exportMatch = chunkBody.match(/^export\s*\{([^}]+)\};\s*$/m);
    const aliasMap = new Map(); // letter -> original
    if (exportMatch) {
      for (const part of exportMatch[1].split(",")) {
        const m = part.trim().match(/^(\w+)\s+as\s+(\w+)$/);
        if (m) aliasMap.set(m[2], m[1]);
      }
      // Strip the export line — declarations stay, exports go.
      chunkBody = chunkBody.replace(exportMatch[0], "");
    }

    // Rewrite each `letter as Original` import → just `Original` (chunk
    // declares it under that name once we've inlined).
    const renames = [];
    for (const part of names.split(",")) {
      const m = part.trim().match(/^(\w+)\s+as\s+(\w+)$/);
      if (m) renames.push([m[1], m[2]]); // [letter, original]
    }

    body = body.replace(importLine, chunkBody.trim() + "\n");

    // Inside the now-inlined chunk text, identifiers were declared under
    // their original names already (declare class Transport, etc.) — no
    // letter rewriting needed inside.
  }

  writeFileSync(entryPath, body, "utf8");
}

function inlineAllEntries() {
  for (const entry of KNOWN_ENTRIES) {
    inlineChunks(join(distDir, `${entry}.d.ts`));
  }
}

function deleteOrphanedChunks() {
  const files = readdirSync(distDir);
  for (const f of files) {
    if (!f.endsWith(".d.ts")) continue;
    const match = f.match(/^([A-Za-z]+)-[A-Za-z0-9_-]+\.d\.ts$/);
    if (!match) continue;
    if (KNOWN_ENTRIES.includes(match[1])) continue;
    // Check no entry still references this chunk
    let referenced = false;
    for (const entry of KNOWN_ENTRIES) {
      const p = join(distDir, `${entry}.d.ts`);
      if (!existsSync(p)) continue;
      if (
        readFileSync(p, "utf8").includes(`./${f.replace(/\.d\.ts$/, ".js")}`)
      ) {
        referenced = true;
        break;
      }
    }
    if (!referenced) unlinkSync(join(distDir, f));
  }
}

function patchSyntheticNamespaces() {
  const modPath = join(distDir, "mod.d.ts");
  let body;
  try {
    body = readFileSync(modPath, "utf8");
  } catch {
    return;
  }

  // Strip the synthetic namespace aliases from the export statement.
  body = body.replace(/[A-Za-z_]+_d_exports as Types,?\s*/g, "");
  body = body.replace(/[A-Za-z_]+_d_exports as Utils,?\s*/g, "");

  // Strip `type` modifiers from re-exports inside `export { ... };` lines.
  // tsdown's downstream consumers (rolldown dts) drop the `type` modifier
  // on imports; they then look for value exports under the same name and
  // hit "Missing export" when we re-export as `type X`. Stripping the
  // modifier keeps the bindings recognized as both value and type
  // (interfaces/types still work; rolldown treats them as namespace-only).
  body = body.replace(/export\s*\{([^}]+)\}\s*;/g, (_match, list) => {
    const cleaned = list.replace(/\btype\s+/g, "");
    return `export {${cleaned}};`;
  });

  // Append explicit namespace declarations.
  const blocks = [];

  blocks.push("declare namespace Types {");
  for (const v of TYPES_MEMBERS.values) blocks.push(`  export { ${v} };`);
  for (const t of TYPES_MEMBERS.types) blocks.push(`  export type { ${t} };`);
  blocks.push("}");
  blocks.push("export { Types };");

  blocks.push("declare namespace Utils {");
  for (const v of UTILS_MEMBERS.values) blocks.push(`  export { ${v} };`);
  for (const [alias, target] of Object.entries(UTILS_MEMBERS.aliases ?? {})) {
    blocks.push(`  export { ${target} as ${alias} };`);
  }
  blocks.push("}");
  blocks.push("export { Utils };");

  body = `${body.trimEnd()}\n\n${blocks.join("\n")}\n`;
  writeFileSync(modPath, body, "utf8");
}

renameEntries();
inlineAllEntries();
patchSyntheticNamespaces();
deleteOrphanedChunks();
