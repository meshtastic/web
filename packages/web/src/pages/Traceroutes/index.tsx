import { Mono } from "@components/generic/Mono.tsx";
import { TimeAgo } from "@components/generic/TimeAgo.tsx";
import { tracerouteHasFullPositions } from "@components/PageComponents/Map/Layers/TracerouteLayer.tsx";
import { TraceRoute } from "@components/PageComponents/Messages/TraceRoute.tsx";
import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/UI/Tooltip.tsx";
import useLang from "@core/hooks/useLang.ts";
import { useDevice, useNodeDB } from "@core/stores";
import { cn } from "@core/utils/cn.ts";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import { TriangleAlertIcon } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const CELL = "whitespace-nowrap px-3 py-2 text-text-secondary";

const TraceroutesPage = () => {
  const { t } = useTranslation("ui");
  const { traceroutes, pendingTraceroutes, hardware } = useDevice();
  const { getNode } = useNodeDB();
  const { current } = useLang();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const allTraceroutes = useMemo(() => {
    const list = [...traceroutes.values()].flat();
    list.sort((a, b) => {
      const aTime = a.rxTime instanceof Date ? a.rxTime.getTime() : 0;
      const bTime = b.rxTime instanceof Date ? b.rxTime.getTime() : 0;
      return bTime - aTime;
    });
    return list;
  }, [traceroutes]);

  const pendingList = useMemo(() => [...pendingTraceroutes.entries()], [pendingTraceroutes]);

  const isEmpty = allTraceroutes.length === 0 && pendingList.length === 0;

  return (
    <PageLayout label={t("navigation.traceroutes")} actions={[]} leftBar={<Sidebar />}>
      <div className="overflow-y-auto">
        {isEmpty ? (
          <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
            No traceroutes recorded yet
          </div>
        ) : (
          <TooltipProvider>
            <table className="min-w-full">
              <thead className="text-xs font-semibold">
                <tr>
                  <th className="py-2 px-3 text-left">Origin</th>
                  <th className="py-2 px-3 text-left">Destination</th>
                  <th className="py-2 px-3 text-left">Hops</th>
                  <th className="py-2 px-3 text-left">Time</th>
                  <th className="py-2 px-3" />
                </tr>
              </thead>
              <tbody>
                {pendingList.map(([destNum, sentAt]) => {
                  const dest = getNode(destNum);
                  const destName = dest?.user?.longName ?? `!${numberToHexUnpadded(destNum)}`;
                  const myNode = getNode(hardware.myNodeNum);

                  return (
                    <tr
                      key={`pending-${destNum}`}
                      className="animate-pulse text-sm bg-yellow-50 dark:bg-yellow-900/20"
                    >
                      <td className={CELL}>
                        <Mono>
                          {myNode?.user?.longName ?? `!${numberToHexUnpadded(hardware.myNodeNum)}`}
                        </Mono>
                      </td>
                      <td className={CELL}>
                        <Mono>{destName}</Mono>
                      </td>
                      <td className={cn(CELL, "text-slate-400 italic")}>waiting…</td>
                      <td className={CELL}>
                        <TimeAgo timestamp={sentAt} locale={current?.code} />
                      </td>
                      <td className={CELL} />
                    </tr>
                  );
                })}

                {allTraceroutes.map((traceroute) => {
                  const key = `${traceroute.from}-${traceroute.id}`;
                  const isExpanded = expandedKey === key;

                  const origin = getNode(traceroute.to);
                  const dest = getNode(traceroute.from);
                  const route = traceroute.data.route ?? [];
                  const routeBack = traceroute.data.routeBack ?? [];
                  const snrTowards = (traceroute.data.snrTowards ?? []).map((s) => s / 4);
                  const snrBack = (traceroute.data.snrBack ?? []).map((s) => s / 4);
                  const hopCount = route.length + 1;
                  const rxTime =
                    traceroute.rxTime instanceof Date ? traceroute.rxTime.getTime() : 0;
                  const canShowOnMap = tracerouteHasFullPositions(traceroute, getNode);

                  return (
                    <Fragment key={key}>
                      <tr
                        className={cn(
                          "cursor-pointer text-sm",
                          isExpanded
                            ? "bg-slate-100 dark:bg-slate-700"
                            : "bg-white dark:bg-slate-900 odd:bg-slate-200/40 dark:odd:bg-slate-800/40 hover:brightness-hover",
                        )}
                        onClick={() => setExpandedKey(isExpanded ? null : key)}
                      >
                        <td className={CELL}>
                          <Mono>
                            {origin?.user?.longName ?? `!${numberToHexUnpadded(traceroute.to)}`}
                          </Mono>
                        </td>
                        <td className={CELL}>
                          <Mono>
                            {dest?.user?.longName ?? `!${numberToHexUnpadded(traceroute.from)}`}
                          </Mono>
                        </td>
                        <td className={CELL}>
                          <Mono>{hopCount}</Mono>
                        </td>
                        <td className={CELL}>
                          {rxTime > 0 && <TimeAgo timestamp={rxTime} locale={current?.code} />}
                        </td>
                        <td className="px-3 py-2">
                          {!canShowOnMap && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <TriangleAlertIcon
                                  size={15}
                                  className="text-amber-500"
                                  aria-label="Map position unavailable"
                                />
                              </TooltipTrigger>
                              <TooltipContent side="left">
                                One or more nodes in this route have no GPS position — the map will
                                show a direct dashed line instead of the full hop path.
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="px-3 py-3 bg-slate-50 dark:bg-slate-800">
                            <TraceRoute
                              route={route}
                              routeBack={routeBack}
                              from={{ user: origin?.user }}
                              to={{ user: dest?.user }}
                              snrTowards={snrTowards}
                              snrBack={snrBack}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </TooltipProvider>
        )}
      </div>
    </PageLayout>
  );
};

export default TraceroutesPage;
