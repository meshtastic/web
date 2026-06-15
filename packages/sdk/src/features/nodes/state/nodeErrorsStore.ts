import { SignalMap } from "../../../core/signals/createStore.ts";
import type { NodeError } from "../domain/NodeError.ts";

export class NodeErrorsStore extends SignalMap<number, NodeError> {}
