import { cn } from "@core/utils/cn.ts";

/** Which hops the dashed route draws, and how "your" radio looks. */
export type MeshScene =
  | "welcome"
  | "searching"
  | "failed"
  | "connected"
  | "channel"
  | "done"
  | "idle";

const ROUTES: Record<MeshScene, string> = {
  welcome: "M110 140 L230 230",
  searching: "M280 520 L330 420",
  failed: "",
  connected: "M280 520 L330 420",
  channel: "M280 520 L330 420 L360 300 L230 230",
  done: "M110 140 L230 230 L200 370 L330 420 L280 520",
  idle: "M280 520 L330 420",
};

const NODES = [
  { cx: 110, cy: 140, r: 16 },
  { cx: 350, cy: 150, r: 16 },
  { cx: 360, cy: 300, r: 14 },
  { cx: 200, cy: 370, r: 18 },
  { cx: 90, cy: 430, r: 14 },
  { cx: 330, cy: 420, r: 16 },
] as const;

export interface MeshIllustrationProps {
  scene: MeshScene;
  caption: string;
  className?: string;
}

/**
 * The decorative mesh beside each step: radios as circles, the hops a
 * message takes as a dashed line, and a caption explaining the step. The
 * caption repeats nothing essential, so the whole panel is aria-hidden.
 */
export const MeshIllustration = ({
  scene,
  caption,
  className,
}: MeshIllustrationProps) => {
  const failed = scene === "failed";
  const connected =
    scene === "connected" || scene === "channel" || scene === "done";
  return (
    <aside
      aria-hidden="true"
      className={cn(
        "relative min-h-[620px] overflow-hidden border-l border-subtle bg-app",
        className,
      )}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 440 620"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0"
      >
        <g
          fill="none"
          strokeWidth={2}
          className="stroke-[var(--mt-accent-tint-border)] opacity-40"
        >
          <path d="M110 140 L230 230 L350 150" />
          <path d="M230 230 L200 370 L90 430" />
          <path d="M200 370 L330 420 L360 300 L230 230" />
          <path d="M330 420 L280 520" />
        </g>
        <path
          d={ROUTES[scene]}
          fill="none"
          strokeWidth={2.5}
          strokeDasharray="6 8"
          className={failed ? "stroke-danger-strong" : "stroke-accent"}
        />
        {NODES.map((node) => (
          <circle
            key={`${node.cx}-${node.cy}`}
            {...node}
            strokeWidth={2}
            className="fill-[var(--mt-bg-raised)] stroke-[var(--mt-border-elevated)]"
          />
        ))}
        <circle
          cx={230}
          cy={230}
          r={20}
          strokeWidth={2.5}
          className="fill-[var(--mt-accent-tint)] stroke-accent"
        />
        <circle
          cx={280}
          cy={520}
          r={22}
          strokeWidth={2.5}
          className={cn(
            connected
              ? "fill-device-avatar stroke-[var(--mt-accent-hover)]"
              : failed
                ? "fill-[var(--mt-bubble-failed)] stroke-danger-strong"
                : "fill-[var(--mt-bg-raised)] stroke-accent",
          )}
        />
        <circle
          cx={280}
          cy={520}
          r={scene === "searching" ? 48 : 34}
          fill="none"
          strokeWidth={2}
          strokeOpacity={0.3}
          className={cn(
            failed ? "stroke-danger-strong" : "stroke-accent",
            scene === "searching" && "motion-safe:animate-pulse",
          )}
        />
      </svg>
      <div className="absolute right-6 bottom-6 left-6 rounded-panel border border-elevated bg-overlay px-4 py-3.5 text-help leading-normal text-secondary">
        {caption}
      </div>
    </aside>
  );
};
