import { useDeviceContext } from "@core/stores";
import { useNodes } from "@data/hooks";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import { useTranslation } from "react-i18next";

interface NodeInfo {
  longName: string | null;
  shortName: string | null;
  nodeNum: number;
}

export interface TraceRouteProps {
  from: NodeInfo;
  to: NodeInfo;
  route: Array<number>;
  routeBack?: Array<number>;
  snrTowards?: Array<number>;
  snrBack?: Array<number>;
}

interface RoutePathProps {
  title: string;
  from: NodeInfo;
  to: NodeInfo;
  path: number[];
  snr?: number[];
}

const RoutePath = ({ title, from, to, path, snr }: RoutePathProps) => {
  const { deviceId } = useDeviceContext();
  const { nodes: allNodes } = useNodes(deviceId);
  const { t } = useTranslation();

  // Create getNode function from database nodes
  const getNode = (nodeNum: number) => {
    return allNodes.find((n) => n.nodeNum === nodeNum);
  };

  return (
    <span
      id={title}
      className="ml-4 border-l-2 pl-2 border-l-slate-900 text-slate-900 dark:text-slate-100 dark:border-l-slate-100"
    >
      <p className="font-semibold">{title}</p>
      <p>{from?.longName}</p>
      <p>
        ↓ {snr?.[0] ?? t("unknown.num")}
        {t("unit.dbm")}
      </p>
      {path.map((hop, i) => (
        <span key={getNode(hop)?.nodeNum ?? hop}>
          <p>
            {getNode(hop)?.longName ??
              `${t("unknown.longName")} (!${numberToHexUnpadded(hop)})`}
          </p>
          <p>
            ↓ {snr?.[i + 1] ?? t("unknown.num")}
            {t("unit.dbm")}
          </p>
        </span>
      ))}
      <p>{to?.longName}</p>
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
  const { t } = useTranslation("dialog");
  return (
    <div className="ml-5 flex">
      <RoutePath
        title={t("traceRoute.routeToDestination")}
        to={to}
        from={from}
        path={route}
        snr={snrTowards}
      />
      {routeBack && routeBack.length > 0 && (
        <RoutePath
          title={t("traceRoute.routeBack")}
          to={from}
          from={to}
          path={routeBack}
          snr={snrBack}
        />
      )}
    </div>
  );
};
