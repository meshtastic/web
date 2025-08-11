import { useNodeDB } from "@core/stores";
import type { Protobuf } from "@meshtastic/core";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import { useTranslation } from "react-i18next";

type NodeUser = Pick<Protobuf.Mesh.NodeInfo, "user">;

export interface TraceRouteProps {
  from: NodeUser;
  to: NodeUser;
  route: Array<number>;
  routeBack?: Array<number>;
  snrTowards?: Array<number>;
  snrBack?: Array<number>;
}

interface RoutePathProps {
  title: string;
  from: NodeUser;
  to: NodeUser;
  path: number[];
  snr?: number[];
}

const RoutePath = ({ title, from, to, path, snr }: RoutePathProps) => {
  const { getNode } = useNodeDB();
  const { t } = useTranslation();

  return (
    <span
      id={title}
      className="ml-4 border-l-2 pl-2 border-l-slate-900 text-slate-900 dark:text-slate-100 dark:border-l-slate-100"
    >
      <p className="font-semibold">{title}</p>
      <p>{from?.user?.longName}</p>
      <p>
        ↓ {snr?.[0] ?? t("unknown.num")}
        {t("unit.dbm")}
      </p>
      {path.map((hop, i) => (
        <span key={getNode(hop)?.num ?? hop}>
          <p>
            {getNode(hop)?.user?.longName ??
              `${t("unknown.longName")} (!${numberToHexUnpadded(hop)})`}
          </p>
          <p>
            ↓ {snr?.[i + 1] ?? t("unknown.num")}
            {t("unit.dbm")}
          </p>
        </span>
      ))}
      <p>{to?.user?.longName}</p>
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
