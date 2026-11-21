import { StatusDot, type StatusDotStatus } from "@components/UI/StatusDot.tsx";
import { cn } from "@core/utils/cn.ts";
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
  "relative inline-flex shrink-0 select-none items-center justify-center font-semibold leading-none",
  {
    variants: {
      size: {
        // Sized so four 13px initials fit without truncating.
        xs: "size-9 text-meta tracking-tight",
        sm: "size-10 text-meta tracking-tight",
        md: "size-11 text-meta",
        lg: "size-12 text-meta",
        xl: "size-[72px] text-header-lg",
        "2xl": "size-20 text-header-lg font-bold",
      },
      shape: {
        squircle: "rounded-squircle",
        rounded: "rounded-card",
      },
    },
    defaultVariants: { size: "md", shape: "squircle" },
  },
);

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
  shape?: "squircle" | "rounded";
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
 * Round (or rounded-square) initials avatar. Purely presentational: the
 * caller supplies initials and what kind of thing it represents.
 */
export const NodeAvatar = ({
  initials,
  tone,
  size = "md",
  shape = "squircle",
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
  const style: (CSSProperties & Record<"--avatar-bg", string>) | undefined =
    nodeColors ? { "--avatar-bg": nodeColors.background } : undefined;
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
        avatarVariants({ size, shape }),
        tone.kind === "device" && "bg-device-avatar text-on-device-avatar",
        tone.kind === "channel" &&
          "bg-accent-tint text-accent text-header-lg font-bold",
        nodeColors && "bg-(--avatar-bg)",
        nodeColors &&
          (nodeColors.ink === "dark"
            ? "text-avatar-ink-dark"
            : "text-avatar-ink-light"),
        className,
      )}
      style={style}
    >
      <span aria-hidden={exposeDot ? true : undefined} className="contents">
        <span className="truncate px-px">{initials}</span>
        {children}
      </span>
      {dot}
    </span>
  );
};
