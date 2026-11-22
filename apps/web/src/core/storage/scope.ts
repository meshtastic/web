import { Result } from "better-result";

/**
 * The `device_id` a connection's repositories read and write under, shared
 * by all of them so they always agree.
 *
 * History belongs to a radio, whatever transport reached it, so `device_id`
 * is the radio's node number. Until the handshake names the radio, a
 * connection works under a provisional scope: a negative id of its own (see
 * `provisionalScopeId`). Once the radio is known, `moveTo` hands that
 * connection's rows over to the radio's history.
 *
 * Every repository call goes through `run`, which captures the id once for
 * the whole call. A move waits for every call already started, and every
 * call made after it waits for the move, so nothing is read from or written
 * to the old id after the move nor to the new id before it, whatever order
 * the database driver happens to run queries in.
 */
export class StorageScope {
  private current: number;
  private barrier: Promise<unknown> = Promise.resolve();
  private readonly inflight = new Set<Promise<unknown>>();

  constructor(deviceId: number) {
    this.current = deviceId;
  }

  get deviceId(): number {
    return this.current;
  }

  /** True until the radio is named: rows written now belong to no radio yet. */
  get provisional(): boolean {
    return isProvisionalScope(this.current);
  }

  /** Runs one repository call under the scope it runs in. */
  run<T>(op: (deviceId: number) => Promise<T>): Promise<T> {
    const call = this.barrier.then(() => op(this.current));
    this.inflight.add(call);
    const done = () => {
      this.inflight.delete(call);
    };
    call.then(done, done);
    return call;
  }

  /**
   * Points later calls at `deviceId`, leaving every row where it is: for a
   * session that reaches a different radio once it was named.
   */
  set(deviceId: number): void {
    this.current = deviceId;
  }

  /**
   * Points later calls at `deviceId` straight away and, once every call
   * already started has finished, runs `move` from the old id to the new
   * one. Calls made from now on run after the move, whether or not it
   * succeeds.
   */
  moveTo<E>(
    deviceId: number,
    move: (from: number, to: number) => Promise<Result<void, E>>,
  ): Promise<Result<void, E>> {
    const from = this.current;
    this.current = deviceId;
    const started = [...this.inflight];
    const moved = Promise.allSettled([this.barrier, ...started]).then(() =>
      move(from, deviceId),
    );
    this.barrier = moved.catch(() => undefined);
    return moved;
  }

  /**
   * Runs `op` with the current id once every call already started has
   * finished, holding later calls until it is done.
   */
  exclusive<T>(op: (deviceId: number) => Promise<T>): Promise<T> {
    const started = [...this.inflight];
    const result = Promise.allSettled([this.barrier, ...started]).then(() =>
      op(this.current),
    );
    this.barrier = result.catch(() => undefined);
    return result;
  }
}

/** Ids below zero are provisional; node numbers never are. */
export function isProvisionalScope(deviceId: number): boolean {
  return deviceId < 0;
}

/** A real radio's history: a node number, which is never zero or negative. */
export function isRadioScope(deviceId: number): boolean {
  return Number.isInteger(deviceId) && deviceId > 0;
}

// Starts somewhere in the lower half of the negative 32-bit range and
// counts down; a page would need a billion connects to leave it.
let nextProvisional = -1 - Math.floor(Math.random() * 0x4000_0000);

/**
 * A provisional id no other connection attempt in this page has had. The
 * random start keeps it apart from any left over by an earlier page that
 * the startup sweep could not remove.
 */
export function provisionalScopeId(): number {
  const id = nextProvisional;
  nextProvisional -= 1;
  return id;
}

/** Why a provisional scope's rows could not be moved. */
export class ScopeMoveError extends Error {
  override readonly name = "ScopeMoveError";
}

/**
 * Checks a move is from a provisional scope to a radio: rows are never taken
 * from another radio's history, nor filed under anything but a radio.
 */
export function checkScopeMove(
  from: number,
  to: number,
): Result<void, ScopeMoveError> {
  if (!isProvisionalScope(from)) {
    return Result.err(
      new ScopeMoveError(`refusing to move rows out of radio scope ${from}`),
    );
  }
  if (!isRadioScope(to)) {
    return Result.err(
      new ScopeMoveError(`refusing to move rows into non-radio scope ${to}`),
    );
  }
  return Result.ok(undefined);
}

/**
 * Where a repository keeps its rows: a scope shared with the connection's
 * other repositories, or a fixed `device_id` (tests, single-radio tools).
 */
export type ScopeOptions =
  | { readonly scope: StorageScope }
  | { readonly deviceId: number };

export function scopeOf(options: ScopeOptions): StorageScope {
  return "scope" in options
    ? options.scope
    : new StorageScope(options.deviceId);
}
