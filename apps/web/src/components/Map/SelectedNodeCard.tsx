import { NodeRowAvatar } from "@components/Nodes/NodeRowAvatar.tsx";
import type { NodeActions } from "@components/Nodes/useNodeActions.ts";
import type { NodeLabels } from "@components/Nodes/useNodeLabels.ts";
import { Button } from "@components/UI/Button.tsx";
import { IconButton } from "@components/UI/IconButton.tsx";
import type { NodeRow } from "@core/nodes/nodeRow.ts";
import { cn } from "@core/utils/cn.ts";
import { InfoIcon, XIcon } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { useTranslation } from "react-i18next";

export interface SelectedNodeCardProps {
  row: NodeRow;
  labels: NodeLabels;
  actions: Pick<NodeActions, "message" | "traceroute" | "openAllDetails">;
  /** Close button and Escape; the caller decides where focus goes next. */
  onClose: () => void;
  className?: string;
}

/**
 * Card for the node picked on the map: who it is, Message and Traceroute.
 * Its heading takes focus when a node is picked; Escape closes it.
 */
export const SelectedNodeCard = ({
  row,
  labels,
  actions,
  onClose,
  className,
}: SelectedNodeCardProps) => {
  const { t } = useTranslation("map");
  const titleId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [row.num]);

  // Escape from anywhere inside the card closes it.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    section.addEventListener("keydown", onKeyDown);
    return () => section.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  const battery = row.battery ? labels.battery(row) : undefined;
  return (
    <section
      aria-labelledby={titleId}
      ref={sectionRef}
      className={cn(
        "flex w-[260px] flex-col gap-2.5 rounded-panel border border-control bg-surface p-3.5 text-primary shadow-dialog",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        <NodeRowAvatar row={row} size="md" />
        <div className="min-w-0 flex-1">
          <h2
            ref={headingRef}
            id={titleId}
            tabIndex={-1}
            className="m-0 truncate text-body font-semibold outline-none"
          >
            {row.name}
          </h2>
          <p className="m-0 truncate text-meta text-muted">
            {labels.summary(row)}
          </p>
        </div>
        <IconButton
          aria-label={t("selected.close")}
          size="sm"
          icon={<XIcon className="size-4" />}
          onClick={onClose}
        />
      </div>
      {row.hardware || battery || row.altitude !== undefined ? (
        <p className="m-0 text-meta text-secondary">
          {[
            row.hardware,
            battery,
            row.altitude !== undefined
              ? t("selected.altitude", { value: row.altitude })
              : undefined,
          ]
            .filter((part) => part !== undefined)
            .join(" · ")}
        </p>
      ) : null}
      <div className="flex gap-2">
        {row.isMessageable ? (
          <Button
            variant="primary"
            size="sm"
            className="h-9 flex-1"
            onClick={actions.message}
          >
            {t("button.message")}
          </Button>
        ) : null}
        {row.isSelf ? null : (
          <Button
            variant="secondary"
            size="sm"
            className="h-9 flex-1"
            onClick={actions.traceroute}
          >
            {t("selected.traceroute")}
          </Button>
        )}
        <IconButton
          aria-label={t("selected.moreDetails")}
          variant="secondary"
          size="md"
          icon={<InfoIcon className="size-4" />}
          onClick={actions.openAllDetails}
        />
      </div>
    </section>
  );
};
