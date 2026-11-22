import {
  type IndexedCommand,
  isCommandKind,
  isSearching,
  type ParsedQuery,
  scoreIndexed,
} from "./search.ts";
import { type Command, type CommandGroupId, commandGroupIds } from "./types.ts";

export interface ResultGroup {
  readonly id: CommandGroupId;
  readonly commands: ReadonlyArray<Command>;
}

/** Rows per group: a short list when browsing, a longer one when searching. */
export interface GroupLimits {
  readonly browsing: Partial<Record<CommandGroupId, number>>;
  readonly searching: Partial<Record<CommandGroupId, number>>;
}

/**
 * Meshes can hold hundreds of nodes, so entity groups are capped; command
 * groups are short, fixed lists and are not.
 */
export const defaultGroupLimits: GroupLimits = {
  browsing: { conversations: 6, nodes: 5 },
  searching: { conversations: 8, nodes: 8 },
};

export interface BuildResultsOptions {
  /** Groups the user pinned; they lead, in default order. */
  readonly pinned?: ReadonlyArray<CommandGroupId>;
  readonly limits?: GroupLimits;
}

interface Scored {
  readonly command: Command;
  readonly score: number;
  readonly index: number;
}

const byScoreThenRegistryOrder = (a: Scored, b: Scored): number =>
  b.score - a.score || a.index - b.index;

/**
 * Filter, rank and group the registry for a query.
 *
 * Browsing (empty query): search-only rows are hidden and rows keep registry
 * order. Searching: rows must match every term, are sorted by relevance, and
 * groups are ordered by their best match. Pinned groups always come first.
 * `>` mode keeps only navigation and action commands.
 */
export const buildResults = (
  commands: ReadonlyArray<IndexedCommand>,
  query: ParsedQuery,
  options: BuildResultsOptions = {},
): ReadonlyArray<ResultGroup> => {
  const searching = isSearching(query);
  const limits = options.limits ?? defaultGroupLimits;
  const pinned: ReadonlySet<CommandGroupId> = new Set(options.pinned ?? []);

  const scored: Scored[] = [];
  commands.forEach((entry, index) => {
    const { command } = entry;
    if (query.commandsOnly && !isCommandKind(command)) {
      return;
    }
    if (!searching) {
      if (!command.searchOnly) {
        scored.push({ command, score: 0, index });
      }
      return;
    }
    const score = scoreIndexed(entry, query.terms);
    if (score > 0) {
      scored.push({ command, score, index });
    }
  });

  const groups = commandGroupIds
    .map((id, order) => {
      const rows = scored
        .filter((row) => row.command.group === id)
        .sort(byScoreThenRegistryOrder);
      const limit = (searching ? limits.searching : limits.browsing)[id];
      const kept = limit === undefined ? rows : rows.slice(0, limit);
      return {
        id,
        order,
        best: kept[0]?.score ?? 0,
        pinned: pinned.has(id),
        commands: kept.map((row) => row.command),
      };
    })
    .filter((group) => group.commands.length > 0);

  groups.sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      (searching ? b.best - a.best : 0) ||
      a.order - b.order,
  );

  return groups.map(({ id, commands: rows }) => ({ id, commands: rows }));
};

/** Every visible command, in display order (for counts and defaults). */
export const flattenResults = (
  groups: ReadonlyArray<ResultGroup>,
): ReadonlyArray<Command> => groups.flatMap((group) => group.commands);
