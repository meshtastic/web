import { H4 } from "@components/UI/Typography/H4.js";

export interface SidebarSectionProps {
  label: string;
  subheader?: string;
  children: React.ReactNode;
}

export const SidebarSection = ({
  label: title,
  children,
}: SidebarSectionProps): JSX.Element => (
  <div className="px-4 py-2">
    <H4 className="mb-2 ml-2">{title}</H4>
    <div className="space-y-1">{children}</div>
  </div>
);
