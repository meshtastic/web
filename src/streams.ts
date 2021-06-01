import { ObservableResource } from 'observable-hooks';
import { Subject } from 'rxjs';

import type { Protobuf, Types } from '@meshtastic/meshtasticjs';

export const preferencesSubject$ =
  new Subject<Protobuf.RadioConfig_UserPreferences>();

export const preferencesResource = new ObservableResource(preferencesSubject$);

export const nodeSubject$ = new Subject<Types.NodeInfoPacket>();

export const nodeResource = new ObservableResource(nodeSubject$);

export const channelSubject$ = new Subject<Protobuf.Channel>();

export const channelResource = new ObservableResource(channelSubject$);
