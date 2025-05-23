import { useDevice } from "@core/stores/deviceStore.ts";
import type { Protobuf } from "@meshtastic/core";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

  return (
    <span
      id={title}
      className="ml-4 border-l-2 pl-2 border-l-slate-900 text-slate-900 dark:text-slate-100 dark:border-l-slate-100"
    >
      <p className="font-semibold">{title}</p>
      <p>{startNode?.user?.longName}</p>
      <p>
        ↓ {snr?.[0] ?? t("traceRoute_snrUnknown")}
        {t("common_unit_dbm")}
      </p>
      {path.map((hop, i) => (
        <span key={getNode(hop)?.num ?? hop}>
          <p>
            {getNode(hop)?.user?.longName ??
              `${t("traceRoute_nodeUnknownPrefix")}${numberToHexUnpadded(hop)}`}
          </p>
          <p>
            ↓ {snr?.[i + 1] ?? t("traceRoute_snrUnknown")}
            {t("common_unit_dbm")}
          </p>
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
  const { t } = useTranslation();
  return (
    <div className="ml-5 flex">
      <RoutePath
        title={t("traceRoute_routeToDestinationTitle")}
        startNode={to}
        endNode={from}
        path={route}
        snr={snrTowards}
      />
      {routeBack && routeBack.length > 0 && (
        <RoutePath
          title={t("traceRoute_routeBackTitle")}
          startNode={from}
          endNode={to}
          path={routeBack}
          snr={snrBack}
        />
      )}
    </div>
  );
};
