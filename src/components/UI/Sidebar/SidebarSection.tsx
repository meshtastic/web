import { Heading } from "../Typography/Heading.tsx";

export interface SidebarSectionProps {
  label: string;
  subheader?: string;
  children: React.ReactNode;
}

export const SidebarSection = ({
  label: title,
  children,
}: SidebarSectionProps) => (
  <div className="px-4 py-2">
    <Heading as="h4" className="mb-3 ml-2">
      {title}
    </Heading>
    <div className="space-y-1">{children}</div>
  </div>
);
