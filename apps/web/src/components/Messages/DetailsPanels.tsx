import { NodeDetailsPanel } from "@components/Nodes/NodeDetailsPanel.tsx";
import type { NodeActions } from "@components/Nodes/useNodeActions.ts";
import type { NodeLabels } from "@components/Nodes/useNodeLabels.ts";
import { Button } from "@components/UI/Button.tsx";
import { IconButton } from "@components/UI/IconButton.tsx";
import { KeyValue, KeyValueList } from "@components/UI/KeyValue.tsx";
import { NodeAvatar } from "@components/UI/NodeAvatar.tsx";
import { SectionHeader } from "@components/UI/SectionHeader.tsx";
import type { ChannelEncryption } from "@core/messaging/channelInfo.ts";
import type { NodeRow } from "@core/nodes/nodeRow.ts";
import { Link } from "@tanstack/react-router";
import { QrCodeIcon, SettingsIcon, XIcon } from "lucide-react";
import { type ReactNode, useId } from "react";
import { useTranslation } from "react-i18next";

interface DetailsFrameProps {
  title: string;
  /** Closes the panel; omitted where the drawer has its own close button. */
  onClose?: () => void;
  children: ReactNode;
}

/** 64px titled header with a close button over the panel's content. */
const DetailsFrame = ({ title, onClose, children }: DetailsFrameProps) => {
  const { t } = useTranslation("messages");
  return (
    <div className="-mx-2 flex min-h-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-subtle px-4">
        <h2 className="m-0 text-header font-semibold">{title}</h2>
        {onClose ? (
          <IconButton
            aria-label={t("header.closeDetails")}
            icon={<XIcon className="size-[18px]" />}
            onClick={onClose}
          />
        ) : null}
      </div>
      {children}
    </div>
  );
};

const encryptionKeys = {
  none: "channelDetails.encNone",
  defaultKey: "channelDetails.encDefault",
  aes128: "channelDetails.encAes128",
  aes256: "channelDetails.encAes256",
} as const satisfies Record<ChannelEncryption, string>;

export interface HeardNodeView {
  readonly num: number;
  readonly name: string;
  readonly initials: string;
  /** "2 hops · 3m". */
  readonly meta: string;
}

export interface ChannelDetailsPanelProps {
  primary: boolean;
  encryption: ChannelEncryption;
  muted: boolean;
  heard: readonly HeardNodeView[];
  /** Every node this radio knows, for "View all N nodes". */
  totalNodes: number;
  onShareQr: () => void;
  onOpenNode: (nodeNum: number) => void;
  onClose?: () => void;
}

/**
 * The channel's role and encryption, a QR share and its settings, and the
 * nodes heard on it in the last two hours.
 */
export const ChannelDetailsPanel = ({
  primary,
  encryption,
  muted,
  heard,
  totalNodes,
  onShareQr,
  onOpenNode,
  onClose,
}: ChannelDetailsPanelProps) => {
  const { t } = useTranslation("messages");
  const heardId = useId();
  return (
    <DetailsFrame title={t("header.channelDetails")} onClose={onClose}>
      <div className="flex flex-col gap-3 border-b border-subtle p-4">
        <KeyValueList className="grid grid-cols-2 gap-2">
          <KeyValue
            variant="tile"
            label={t("channelDetails.role")}
            value={
              primary
                ? t("channelDetails.rolePrimary")
                : t("channelDetails.roleSecondary")
            }
          />
          <KeyValue
            variant="tile"
            label={t("channelDetails.encryption")}
            value={t(encryptionKeys[encryption])}
          />
        </KeyValueList>
        {muted ? (
          <p className="m-0 text-help text-muted">
            {t("channelDetails.muted")}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            icon={<QrCodeIcon aria-hidden="true" className="size-4" />}
            onClick={onShareQr}
          >
            {t("channelDetails.shareQr")}
          </Button>
          <Link
            to="/settings/channels"
            className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-control border border-control px-3 text-help font-medium text-primary hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <SettingsIcon aria-hidden="true" className="size-4" />
            {t("channelDetails.settings")}
          </Link>
        </div>
      </div>
      <section
        aria-labelledby={heardId}
        className="flex min-h-0 flex-1 flex-col"
      >
        <SectionHeader
          id={heardId}
          as="h3"
          title={t("channelDetails.recentlyHeard")}
          className="px-4 pt-3.5 pb-1.5"
          action={
            <span className="text-meta text-muted">
              {t("channelDetails.window")}
            </span>
          }
        />
        {heard.length === 0 ? (
          <p className="m-0 px-4 py-2 text-help text-muted">
            {t("channelDetails.noneHeard")}
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0 px-2">
            {heard.map((node) => (
              <li key={node.num}>
                <button
                  type="button"
                  aria-label={`${t("channelDetails.messageNode", { name: node.name })}, ${node.meta}`}
                  onClick={() => onOpenNode(node.num)}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg p-2 text-left hover:bg-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
                >
                  <NodeAvatar
                    initials={node.initials}
                    tone={{ kind: "node", nodeNum: node.num }}
                    size="xs"
                  />
                  <span className="min-w-0 flex-1 truncate">{node.name}</span>
                  <span className="text-meta whitespace-nowrap text-muted">
                    {node.meta}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="px-4 pt-3 pb-4">
        <Link
          to="/nodes"
          className="flex h-10 items-center justify-center rounded-control bg-raised font-medium text-primary hover:bg-selected focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {t("channelDetails.viewAllNodes", { count: totalNodes })}
        </Link>
      </div>
    </DetailsFrame>
  );
};

export interface DirectDetailsPanelProps {
  row: NodeRow | undefined;
  labels: NodeLabels;
  actions: NodeActions;
  /** Shown when the peer isn't in the node DB. */
  fallbackName: string;
  fallbackId: string;
  onClose?: () => void;
}

/** The peer's node details (the Nodes screen's panel) under a "Node details" header. */
export const DirectDetailsPanel = ({
  row,
  labels,
  actions,
  fallbackName,
  fallbackId,
  onClose,
}: DirectDetailsPanelProps) => {
  const { t } = useTranslation("messages");
  return (
    <DetailsFrame title={t("header.nodeDetails")} onClose={onClose}>
      {row ? (
        <NodeDetailsPanel row={row} labels={labels} actions={actions} />
      ) : (
        <div className="flex flex-col gap-2 p-4">
          <p className="m-0 text-header-lg font-bold">{fallbackName}</p>
          <KeyValueList>
            <KeyValue
              label={t("details.nodeId", { ns: "nodes" })}
              value={fallbackId}
              mono
            />
          </KeyValueList>
        </div>
      )}
    </DetailsFrame>
  );
};
