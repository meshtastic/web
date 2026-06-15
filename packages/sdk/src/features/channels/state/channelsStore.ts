import { SignalMap } from "../../../core/signals/createStore.ts";
import type { Channel } from "../domain/Channel.ts";

export class ChannelsStore extends SignalMap<number, Channel> {}
