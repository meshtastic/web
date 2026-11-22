import { type AvatarSize, NodeAvatar } from "@components/UI/NodeAvatar.tsx";
import type { NodeRow } from "@core/nodes/nodeRow.ts";
import { StarIcon } from "lucide-react";

export interface NodeRowAvatarProps {
  row: NodeRow;
  size?: AvatarSize;
  /** Name it when no visible name sits next to it. */
  label?: string;
  className?: string;
}

/**
 * A node's avatar: its colour and initials, this device in brand blue, and
 * a star for favourites (announced by the row's favourite text, not here).
 */
export const NodeRowAvatar = ({
  row,
  size = "sm",
  label,
  className,
}: NodeRowAvatarProps) => (
  <NodeAvatar
    initials={row.initials}
    tone={row.isSelf ? { kind: "device" } : { kind: "node", nodeNum: row.num }}
    size={size}
    label={label}
    className={className}
  >
    {row.isFavorite ? (
      <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-surface text-warning">
        <StarIcon aria-hidden="true" className="size-2.5 fill-current" />
      </span>
    ) : null}
  </NodeAvatar>
);
