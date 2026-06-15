import { SignalMap } from "../../../core/signals/createStore.ts";
import type { Node } from "../domain/Node.ts";

export class NodesStore extends SignalMap<number, Node> {}
