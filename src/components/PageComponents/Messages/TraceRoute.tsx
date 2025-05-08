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

interface RoutePathProps {
  title: string;
  startNode?: Protobuf.Mesh.NodeInfo;
  endNode?: Protobuf.Mesh.NodeInfo;
  path: number[];
  snr?: number[];
}

const RoutePath = (
  { title, startNode, endNode, path, snr }: RoutePathProps,
) => {
  const { getNode } = useDevice();

  return (
    <span
      id={title}
      className="ml-4 border-l-2 pl-2 border-l-slate-900 text-slate-900 dark:text-slate-100 dark:border-l-slate-100"
    >
      <p className="font-semibold">{title}</p>
      <p>{startNode?.user?.longName}</p>
      <p>↓ {snr?.[0] ?? "??"}dB</p>
      {path.map((hop, i) => (
        <span key={getNode(hop)?.num ?? hop}>
          <p>
            {getNode(hop)?.user?.longName ?? `!${numberToHexUnpadded(hop)}`}
          </p>
          <p>↓ {snr?.[i + 1] ?? "??"}dB</p>
        </span>
      ))}
      <p>{endNode?.user?.longName}</p>
    </span>
  );
};

export const TraceRoute = ({
  from,
  to,
  route,
  routeBack,
  snrTowards,
  snrBack,
}: TraceRouteProps) => {
  return (
    <div className="ml-5 flex">
      <RoutePath
        title="Route to destination:"
        startNode={to}
        endNode={from}
        path={route}
        snr={snrTowards}
      />
      {routeBack && (
        <RoutePath
          title="Route back:"
          startNode={from}
          endNode={to}
          path={routeBack}
          snr={snrBack}
        />
      )}
    </div>
  );
};
