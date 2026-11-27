import { Result } from "better-result";
import { checkScopeMove, isProvisionalScope, ScopeMoveError } from "./scope.ts";

/** One parameterised statement. */
export interface SqlStatement {
  readonly sql: string;
  readonly params: ReadonlyArray<number>;
}

/** Runs statements in one transaction: all of them take effect, or none. */
export type RunAtomically = (
  statements: ReadonlyArray<SqlStatement>,
) => Promise<void>;

const statement = (sql: string, ...params: number[]): SqlStatement => ({
  sql: sql.replace(/\s+/g, " ").trim(),
  params,
});

/**
 * What moves every row under the provisional scope `from` into the radio
 * scope `to`, where the radio's history from other connections may already
 * be. Rows already there win for what both hold (the same message, the same
 * reaction); what this connection did in the meantime wins for what it
 * changed (a draft typed, a conversation read further, a node heard again).
 * Each table is merged and then emptied under `from`, so nothing is left
 * behind and no unique key can make the move fail half-way.
 */
export function adoptionStatements(from: number, to: number): SqlStatement[] {
  return [
    // A message stored under both is the same packet; keep the stored one.
    statement(
      `UPDATE OR IGNORE messages SET device_id = ? WHERE device_id = ?`,
      to,
      from,
    ),
    statement(`DELETE FROM messages WHERE device_id = ?`, from),
    statement(
      `UPDATE OR IGNORE reactions SET device_id = ? WHERE device_id = ?`,
      to,
      from,
    ),
    statement(`DELETE FROM reactions WHERE device_id = ?`, from),
    // `seq` is global, so the further read marker is the later one.
    statement(
      `INSERT INTO read_markers (device_id, conversation_key, last_read_seq)
       SELECT ?, conversation_key, last_read_seq FROM read_markers WHERE device_id = ?
       ON CONFLICT (device_id, conversation_key)
       DO UPDATE SET last_read_seq = max(last_read_seq, excluded.last_read_seq)`,
      to,
      from,
    ),
    statement(`DELETE FROM read_markers WHERE device_id = ?`, from),
    statement(
      `INSERT INTO drafts (device_id, conversation_key, text, updated_at)
       SELECT ?, conversation_key, text, updated_at FROM drafts WHERE device_id = ?
       ON CONFLICT (device_id, conversation_key)
       DO UPDATE SET text = excluded.text, updated_at = excluded.updated_at
       WHERE excluded.updated_at >= drafts.updated_at`,
      to,
      from,
    ),
    statement(`DELETE FROM drafts WHERE device_id = ?`, from),
    // This connection heard these nodes last, but it started from an empty
    // node list: a field it never learned keeps the stored value, and so do
    // favourite, ignored, muted and key-verified, which it only ever saw
    // defaulted (the radio's node DB, which carries them, arrives after the
    // radio is named).
    statement(
      `INSERT INTO nodes (device_id, num, last_heard, snr, is_favorite, is_ignored,
         user_json, position_json, metrics_json, channel, via_mqtt, hops_away,
         is_key_manually_verified, is_muted, has_xeddsa_signed, status)
       SELECT ?, num, last_heard, snr, is_favorite, is_ignored,
         user_json, position_json, metrics_json, channel, via_mqtt, hops_away,
         is_key_manually_verified, is_muted, has_xeddsa_signed, status
         FROM nodes WHERE device_id = ?
       ON CONFLICT (device_id, num) DO UPDATE SET
         last_heard = coalesce(excluded.last_heard, nodes.last_heard),
         snr = coalesce(excluded.snr, nodes.snr),
         user_json = coalesce(excluded.user_json, nodes.user_json),
         position_json = coalesce(excluded.position_json, nodes.position_json),
         metrics_json = coalesce(excluded.metrics_json, nodes.metrics_json),
         channel = coalesce(excluded.channel, nodes.channel),
         via_mqtt = coalesce(excluded.via_mqtt, nodes.via_mqtt),
         hops_away = coalesce(excluded.hops_away, nodes.hops_away),
         has_xeddsa_signed = coalesce(excluded.has_xeddsa_signed, nodes.has_xeddsa_signed),
         status = coalesce(excluded.status, nodes.status)`,
      to,
      from,
    ),
    statement(`DELETE FROM nodes WHERE device_id = ?`, from),
    // Readings have no natural key; each one is kept.
    statement(
      `UPDATE telemetry SET device_id = ? WHERE device_id = ?`,
      to,
      from,
    ),
    // Filter words and opted-out conversations: the union of both lists.
    statement(
      `UPDATE OR IGNORE filter_words SET device_id = ? WHERE device_id = ?`,
      to,
      from,
    ),
    statement(`DELETE FROM filter_words WHERE device_id = ?`, from),
    statement(
      `UPDATE OR IGNORE filter_opt_outs SET device_id = ? WHERE device_id = ?`,
      to,
      from,
    ),
    statement(`DELETE FROM filter_opt_outs WHERE device_id = ?`, from),
    // A provisional row exists only if the switch was flipped on this
    // connection, so it is the newer choice.
    statement(
      `INSERT INTO filter_settings (device_id, enabled)
       SELECT ?, enabled FROM filter_settings WHERE device_id = ?
       ON CONFLICT (device_id) DO UPDATE SET enabled = excluded.enabled`,
      to,
      from,
    ),
    statement(`DELETE FROM filter_settings WHERE device_id = ?`, from),
  ];
}

/**
 * Files the rows a connection wrote before its radio was named under that
 * radio, in one transaction. Refuses anything but a provisional scope to a
 * radio, so no other radio's history is ever touched.
 */
export async function adoptProvisionalRows(
  run: RunAtomically,
  from: number,
  to: number,
): Promise<Result<void, ScopeMoveError>> {
  const checked = checkScopeMove(from, to);
  if (Result.isError(checked)) return checked;
  return Result.tryPromise({
    try: () => run(adoptionStatements(from, to)),
    catch: (cause) =>
      new ScopeMoveError(
        `could not move scope ${from} to ${to}: ${
          cause instanceof Error ? cause.message : String(cause)
        }`,
        { cause },
      ),
  });
}

const PROVISIONAL_TABLES = [
  "messages",
  "reactions",
  "read_markers",
  "drafts",
  "nodes",
  "telemetry",
  "filter_words",
  "filter_settings",
  "filter_opt_outs",
] as const;

/**
 * Deletes the rows under one provisional scope, or under every one. Never a
 * radio's: given anything but a provisional scope it deletes nothing.
 */
export function discardStatements(deviceId?: number): SqlStatement[] {
  if (deviceId !== undefined && !isProvisionalScope(deviceId)) return [];
  return PROVISIONAL_TABLES.map((table) =>
    deviceId === undefined
      ? statement(`DELETE FROM ${table} WHERE device_id < 0`)
      : statement(`DELETE FROM ${table} WHERE device_id = ?`, deviceId),
  );
}
