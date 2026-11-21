import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@components/UI/Card.tsx";
import { DangerZoneCard } from "@components/UI/DangerZoneCard.tsx";
import type { ReactNode } from "react";

export interface SettingsCardProps {
  title: ReactNode;
  description?: ReactNode;
  /** Short note at the right of the title. */
  note?: ReactNode;
  /** `danger` is the red Danger zone card for destructive actions. */
  tone?: "default" | "danger";
  children?: ReactNode;
  className?: string;
}

/** A titled card of setting rows. */
export const SettingsCard = ({
  title,
  description,
  note,
  tone = "default",
  children,
  className,
}: SettingsCardProps) => {
  if (tone === "danger") {
    return (
      <DangerZoneCard title={title} className={className}>
        {description ? (
          <p className="px-4 pb-1 text-help text-muted">{description}</p>
        ) : null}
        {children}
      </DangerZoneCard>
    );
  }
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-baseline justify-between gap-3">
          <CardTitle>{title}</CardTitle>
          {note ? <span className="text-meta text-muted">{note}</span> : null}
        </div>
        {description ? (
          <CardDescription className="text-help">{description}</CardDescription>
        ) : null}
      </CardHeader>
      <div className="flex flex-col">{children}</div>
    </Card>
  );
};
