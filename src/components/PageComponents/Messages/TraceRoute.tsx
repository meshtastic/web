import { useDevice } from "@app/core/stores/deviceStore.ts";
import type { Protobuf } from "@meshtastic/js";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import { useTranslation } from "react-i18next";

export interface TraceRouteProps {
  from?: Protobuf.Mesh.NodeInfo;
  to?: Protobuf.Mesh.NodeInfo;
  route: Array<number>;
}

export const TraceRoute = ({
  from,
  to,
  route,
}: TraceRouteProps): JSX.Element => {
  const { nodes } = useDevice();
  const { t } = useTranslation("translation");

  return route.length === 0 ? (
    <div className="ml-5 flex">
      <span className="ml-4 border-l-2 border-l-backgroundPrimary pl-2 text-textPrimary">
        {to?.user?.longName}↔{from?.user?.longName}
      </span>
    </div>
  ) : (
    <div className="ml-5 flex">
      <span className="ml-4 border-l-2 border-l-backgroundPrimary pl-2 text-textPrimary">
        {to?.user?.longName}↔
        {route.map((hop) => {
          const node = nodes.get(hop);
          return `${
            node?.user?.longName ??
            (node?.num ? numberToHexUnpadded(node.num) : t("Unknown"))
          }↔`;
        })}
        {from?.user?.longName}
      </span>
    </div>
  );
};
