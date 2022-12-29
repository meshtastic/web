import type React from "react";

export interface FormSectionProps {
  title: string;
  children: React.ReactNode;
}

export const FormSection = ({
  title,
  children
}: FormSectionProps): JSX.Element => {
  return (
    <div className="relative">
      <h3 className="absolute left-2 -top-2 bg-backgroundSecondary px-1 text-lg font-medium text-textPrimary">
        {title}
      </h3>
      <div className="mt-2 rounded-md border-2 border-backgroundPrimary p-2">
        {children}
      </div>
    </div>
  );
};
