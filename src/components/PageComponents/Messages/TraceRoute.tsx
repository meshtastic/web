import { useDevice } from "@app/core/stores/deviceStore.ts";
import type { Protobuf } from "@meshtastic/js";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import type { JSX } from "react";

export interface TraceRouteProps {
  from?: Protobuf.Mesh.NodeInfo;
  to?: Protobuf.Mesh.NodeInfo;
  route: Array<number>;
  routeBack?: Array<number>;
  snrTowards?: Array<number>;
  snrBack?: Array<number>;
}

export const TraceRoute = ({
  from,
  to,
  route,
  routeBack,
  snrTowards,
  snrBack,
}: TraceRouteProps): JSX.Element => {
  const { nodes } = useDevice();

  return (
    <div className="ml-5 flex">
      <span className="ml-4 border-l-2 border-l-backgroundPrimary pl-2 text-textPrimary">
        <p className="font-semibold">Route to destination:</p>
        <p>{to?.user?.longName}</p>
        <p>↓ {snrTowards?.[0] ? snrTowards[0] : "??"}dB</p>
        {route.map((hop, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
          <span key={i}>
            <p>
              {nodes.get(hop)?.user?.longName ?? `!${numberToHexUnpadded(hop)}`}
            </p>
            <p>↓ {snrTowards?.[i + 1] ? snrTowards[i + 1] : "??"}dB</p>
          </span>
        ))}
        {from?.user?.longName}
      </span>
      {routeBack ? (
        <span className="ml-4 border-l-2 border-l-backgroundPrimary pl-2 text-textPrimary">
          <p className="font-semibold">Route back:</p>
          <p>{from?.user?.longName}</p>
          <p>↓ {snrBack?.[0] ? snrBack[0] : "??"}dB</p>
          {routeBack.map((hop, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
            <span key={i}>
              <p>
                {nodes.get(hop)?.user?.longName ??
                  `!${numberToHexUnpadded(hop)}`}
              </p>
              <p>↓ {snrBack?.[i + 1] ? snrBack[i + 1] : "??"}dB</p>
            </span>
          ))}
          {to?.user?.longName}
        </span>
      ) : null}
    </div>
  );
};
