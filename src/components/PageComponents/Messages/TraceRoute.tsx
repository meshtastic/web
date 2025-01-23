import { useDevice } from "@app/core/stores/deviceStore.ts";
import type { Protobuf } from "@meshtastic/js";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";

export interface TraceRouteProps {
  from?: Protobuf.Mesh.NodeInfo;
  to?: Protobuf.Mesh.NodeInfo;
  route: Array<number>;
  routeBack?: Array<number>;
}

export const TraceRoute = ({
  from,
  to,
  route,
  routeBack,
}: TraceRouteProps): JSX.Element => {
  const { nodes } = useDevice();

  return route.length === 0 ? (
    <div className="ml-5 flex">
      <span className="ml-4 border-l-2 border-l-backgroundPrimary pl-2 text-textPrimary">
        {to?.user?.longName} ↔ {from?.user?.longName}
      </span>
    </div>
  ) : (
    <div className="ml-5 flex flex-col">
      <span className="ml-4 border-l-2 border-l-backgroundPrimary pl-2 text-textPrimary">
        <p className="font-semibold">Route traced towards destination:</p>
        {to?.user?.longName} ↔{" "}
        {route.map(
          (hop) =>
            `${nodes.get(hop)?.user?.longName ?? `!${numberToHexUnpadded(hop)}`} ↔ `,
        )}
        {from?.user?.longName}
      </span>
      {routeBack ? (
        <span className="ml-4 mt-4 border-l-2 border-l-backgroundPrimary pl-2 text-textPrimary">
          <p className="font-semibold">Route traced back to us:</p>
          {from?.user?.longName} ↔{" "}
          {routeBack.map(
            (hop) =>
              `${nodes.get(hop)?.user?.longName ?? `!${numberToHexUnpadded(hop)}`} ↔ `,
          )}
          {to?.user?.longName}
        </span>
      ) : null}
    </div>
  );
};
