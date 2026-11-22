import { StatusDot, type StatusDotStatus } from "@components/UI/StatusDot.tsx";
import { cn } from "@core/utils/cn.ts";
import { initialsScale } from "@core/utils/avatarFit.ts";
import { nodeAvatarColors } from "@core/utils/nodeIdentity.ts";
import { cva } from "class-variance-authority";
import type { CSSProperties, ReactNode } from "react";

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
  children,
  className,
}: NodeAvatarProps) => {
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
  // A labelled avatar is one image; its name says who it is. A decorative
  // one hides its initials but keeps the presence dot announced.
  const exposeDot = !label && presence !== undefined && presenceLabel !== null;
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label || exposeDot ? undefined : true}
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
      <span aria-hidden={exposeDot ? true : undefined} className="contents">
        <span
          className="whitespace-nowrap"
          // A name too wide for the avatar is drawn smaller, not cut.
          style={scale < 1 ? { fontSize: `${scale}em` } : undefined}
        >
          {initials}
        </span>
        {children}
      </span>
      {dot}
    </span>
  );
};
