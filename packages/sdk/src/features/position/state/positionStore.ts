import { SignalMap } from "../../../core/signals/createStore.ts";
import type { Position } from "../domain/Position.ts";

export class PositionStore extends SignalMap<number, Position> {}
