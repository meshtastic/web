import { SignalMap } from "../../../core/signals/createStore.ts";
import type { TraceRoute } from "../domain/TraceRoute.ts";

export class TraceRouteStore extends SignalMap<number, TraceRoute> {}
