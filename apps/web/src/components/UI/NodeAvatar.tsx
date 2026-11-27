import { StatusDot, type StatusDotStatus } from "@components/UI/StatusDot.tsx";
import { cn } from "@core/utils/cn.ts";
import { initialsScale } from "@core/utils/avatarFit.ts";
import { nodeAvatarColors } from "@core/utils/nodeIdentity.ts";
import { cva } from "class-variance-authority";
import { ShieldKeyholeIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";

/**
 * What the avatar stands for, which picks its colours:
 * - `node`: a mesh node, filled with its per-node colour;
 * - `device`: the connected radio (brand blue);
 * - `channel`: a channel (accent tint with accent text, usually "#").
 */
export type AvatarTone =
  | { readonly kind: "node"; readonly nodeNum: number }
  | { readonly kind: "device" }
  | { readonly kind: "channel" };

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const avatarVariants = cva(
  "relative inline-flex shrink-0 select-none items-center justify-center rounded-avatar font-semibold leading-none",
  {
    variants: {
      size: {
        // Squircles: height, corner radius (a quarter of the height) and
        // width, the same for every avatar of a size whatever its text.
        xs: "h-8 text-meta [--avatar-r:8px] [--avatar-w:52px]",
        sm: "h-9 text-meta [--avatar-r:9px] [--avatar-w:58px]",
        md: "h-10 text-meta [--avatar-r:10px] [--avatar-w:64px]",
        lg: "h-11 text-help [--avatar-r:11px] [--avatar-w:70px]",
        xl: "h-16 text-header-lg [--avatar-r:16px] [--avatar-w:100px]",
        "2xl":
          "h-20 text-header-lg font-bold [--avatar-r:20px] [--avatar-w:124px]",
      },
    },
    defaultVariants: { size: "md" },
  },
);

/**
 * Room for the initials inside each size's width and 6px side padding, in
 * em of its font size (13, 13, 13, 14, 17 and 17px).
 */
const initialsRoomEm = {
  xs: 40 / 13,
  sm: 46 / 13,
  md: 52 / 13,
  lg: 58 / 14,
  xl: 88 / 17,
  "2xl": 112 / 17,
} as const satisfies Record<AvatarSize, number>;

/** The remote admin badge and its icon, grown with the avatar. */
const adminBadgeSize = {
  xs: ["-bottom-1 -left-1 size-4.5", "size-3.5"],
  sm: ["-bottom-1 -left-1 size-4.5", "size-3.5"],
  md: ["-bottom-1 -left-1 size-4.5", "size-3.5"],
  lg: ["-bottom-1 -left-1 size-4.5", "size-3.5"],
  xl: ["-bottom-1.5 -left-1.5 size-6", "size-4.5"],
  "2xl": ["-bottom-1.5 -left-1.5 size-7", "size-5"],
} as const satisfies Record<AvatarSize, readonly [string, string]>;

const dotSize = {
  xs: "sm",
  sm: "md",
  md: "md",
  lg: "lg",
  xl: "lg",
  "2xl": "lg",
} as const satisfies Record<AvatarSize, "sm" | "md" | "lg">;

export interface NodeAvatarProps {
  /** Up to four characters, from `initialsFor`. */
  initials: string;
  tone: AvatarTone;
  size?: AvatarSize;
  /**
   * Accessible name. Omit when the name is shown next to the avatar, which
   * then stays decorative.
   */
  label?: string;
  /** Presence / connection dot in the bottom-right corner. */
  presence?: StatusDotStatus;
  /**
   * Accessible text for the presence dot. Defaults to the dot's own label
   * (Online, Connecting, ...), announced even when the avatar itself is
   * decorative; `null` hides it when nearby text already says it.
   */
  presenceLabel?: string | null;
  /** Colour of the surface behind the avatar, for the dot's cut-out ring. */
  cutout?: "surface" | "app" | "rail" | "selected";
  /**
   * This radio can manage the node remotely: a shield badge in the
   * bottom-left corner, announced like the presence dot.
   */
  adminAccess?: boolean;
  /** Overlays, e.g. a favourite star. */
  children?: ReactNode;
  className?: string;
}

/**
 * Squircle initials avatar. Purely presentational: the caller supplies
 * initials and what kind of thing it represents.
 */
export const NodeAvatar = ({
  initials,
  tone,
  size = "md",
  label,
  presence,
  presenceLabel,
  cutout = "surface",
  adminAccess = false,
  children,
  className,
}: NodeAvatarProps) => {
  const { t } = useTranslation("nodes");
  const nodeColors =
    tone.kind === "node" ? nodeAvatarColors(tone.nodeNum) : undefined;
  // The node fill goes through a custom property so a caller's `bg-*`
  // class can still override it (an inline background-color could not).
  const style:
    | (CSSProperties & Record<"--avatar-bg" | "--avatar-ink", string>)
    | undefined = nodeColors
    ? {
        "--avatar-bg": nodeColors.background,
        "--avatar-ink":
          nodeColors.ink === "dark"
            ? "var(--color-avatar-ink-dark)"
            : "var(--color-avatar-ink-light)",
      }
    : undefined;
  const scale =
    tone.kind === "channel" ? 1 : initialsScale(initials, initialsRoomEm[size]);
  const dot = presence ? (
    <StatusDot
      status={presence}
      size={dotSize[size]}
      cutout={cutout}
      label={label ? null : presenceLabel}
      className="absolute -right-0.5 -bottom-0.5"
    />
  ) : null;
  const adminText = adminAccess ? t("avatar.adminAccess") : undefined;
  const badge = adminAccess ? (
    <span
      title={adminText}
      className={cn(
        "absolute flex items-center justify-center rounded-full bg-surface text-accent",
        adminBadgeSize[size][0],
      )}
    >
      <ShieldKeyholeIcon
        aria-hidden="true"
        className={adminBadgeSize[size][1]}
      />
      {label ? null : <span className="sr-only">{adminText}</span>}
    </span>
  ) : null;
  // A labelled avatar is one image; its name says who it is, and the
  // badge's text joins it. A decorative one hides its initials but keeps
  // the presence dot and the badge announced.
  const exposeDot = !label && presence !== undefined && presenceLabel !== null;
  const exposeExtras = exposeDot || (!label && adminAccess);
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label && adminText ? `${label}, ${adminText}` : label}
      aria-hidden={label || exposeExtras ? undefined : true}
      className={cn(
        avatarVariants({ size }),
        tone.kind === "device" && "bg-device-avatar text-on-device-avatar",
        tone.kind === "channel" &&
          "bg-accent-tint text-accent text-header-lg font-bold",
        // Avatars with initials all share one width per size; the channel
        // "#" stays square.
        tone.kind === "channel" ? "aspect-square" : "w-(--avatar-w) px-1.5",
        nodeColors && "bg-(--avatar-bg)",
        nodeColors && "text-avatar-contrast",
        className,
      )}
      style={style}
    >
      <span aria-hidden={exposeExtras ? true : undefined} className="contents">
        <span
          className="whitespace-nowrap"
          // A name too wide for the avatar is drawn smaller, not cut.
          style={scale < 1 ? { fontSize: `${scale}em` } : undefined}
        >
          {initials}
        </span>
        {children}
      </span>
      {badge}
      {dot}
    </span>
  );
};
