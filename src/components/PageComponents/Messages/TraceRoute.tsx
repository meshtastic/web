import { useDevice } from "@core/stores/deviceStore.ts";
import type { Protobuf } from "@meshtastic/core";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";

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
}: TraceRouteProps) => {
  const { nodes } = useDevice();

  return (
    <div className="ml-5 flex">
      <span className="ml-4 border-l-2 border-l-background-primary pl-2 text-text-primary">
        <p className="font-semibold">Route to destination:</p>
        <p>{to?.user?.longName}</p>
        <p>↓ {snrTowards?.[0] ? snrTowards[0] : "??"}dB</p>
        {route.map((hop, i) => (
          <span key={nodes.get(hop)?.num}>
            <p>
              {nodes.get(hop)?.user?.longName ?? `!${numberToHexUnpadded(hop)}`}
            </p>
            <p>↓ {snrTowards?.[i + 1] ? snrTowards[i + 1] : "??"}dB</p>
          </span>
        ))}
        {from?.user?.longName}
      </span>
      {routeBack
        ? (
          <span className="ml-4 border-l-2 border-l-background-primary pl-2 text-text-primary">
            <p className="font-semibold">Route back:</p>
            <p>{from?.user?.longName}</p>
            <p>↓ {snrBack?.[0] ? snrBack[0] : "??"}dB</p>
            {routeBack.map((hop, i) => (
              <span key={nodes.get(hop)?.num}>
                <p>
                  {nodes.get(hop)?.user?.longName ??
                    `!${numberToHexUnpadded(hop)}`}
                </p>
                <p>↓ {snrBack?.[i + 1] ? snrBack[i + 1] : "??"}dB</p>
              </span>
            ))}
            {to?.user?.longName}
          </span>
        )
        : null}
    </div>
  );
};
