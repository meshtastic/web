import { TimeAgo } from "@components/generic/TimeAgo.tsx";
import { useNodeTelemetryHistory } from "@core/hooks/useNodeTelemetryHistory.ts";
import { telemetrySections } from "@core/utils/telemetry.ts";
import type { TelemetryReading } from "@meshtastic/sdk";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export interface TelemetrySectionsProps {
  readings: readonly TelemetryReading[];
  className?: string;
}

/**
 * Latest reading of each telemetry variant (except deviceMetrics, shown in
 * its own section). Renders nothing when the node reported none.
 */
export const TelemetrySections = ({
  readings,
  className,
}: TelemetrySectionsProps) => {
  const { t, i18n } = useTranslation("dialog");
  const sections = useMemo(
    () => telemetrySections(readings, i18n.language),
    [readings, i18n.language],
  );

  if (sections.length === 0) return null;

  return (
    <section className={className} aria-labelledby="node-telemetry-title">
      <p id="node-telemetry-title" className="text-lg font-semibold">
        {t("nodeDetails.telemetry.title")}
      </p>
      {sections.map((section) => (
        <div key={section.kind} className="mt-2 first-of-type:mt-1">
          <div className="flex items-baseline justify-between gap-2 border-b border-slate-300 dark:border-slate-600 pb-0.5 mb-1">
            <h3 className="font-semibold">
              {t(`nodeDetails.telemetry.kind.${section.kind}`)}
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              <TimeAgo timestamp={section.time} />
            </span>
          </div>
          <table className="table-fixed w-full text-sm">
            <tbody>
              {section.fields.map((field) => (
                <tr key={field.id}>
                  <td className="pr-2">
                    {t(
                      `nodeDetails.telemetry.field.${field.labelKey}`,
                      field.labelOptions,
                    )}
                  </td>
                  <td className="tabular-nums">{field.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
};

export interface NodeTelemetryProps {
  nodeNum: number;
  className?: string;
}

export const NodeTelemetry = ({ nodeNum, className }: NodeTelemetryProps) => {
  const readings = useNodeTelemetryHistory(nodeNum);
  return <TelemetrySections readings={readings} className={className} />;
};
