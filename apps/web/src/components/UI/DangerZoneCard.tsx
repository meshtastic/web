import { Card, CardHeader, CardTitle } from "@components/UI/Card.tsx";
import type { ReactNode } from "react";

export interface DangerZoneCardProps {
  title: ReactNode;
  /** Rows of destructive actions, each confirmed before it runs. */
  children: ReactNode;
  className?: string;
}

/** Red-bordered card that groups destructive settings actions. */
export const DangerZoneCard = ({
  title,
  children,
  className,
}: DangerZoneCardProps) => (
  <Card tone="danger" className={className}>
    <CardHeader>
      <CardTitle className="text-danger">{title}</CardTitle>
    </CardHeader>
    <div className="flex flex-col">{children}</div>
  </Card>
);
