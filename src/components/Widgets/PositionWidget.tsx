import type React from "react";

export interface PositionWidgetProps {}

export const PositionWidget = ({}: PositionWidgetProps): JSX.Element => {
  return (
    <div className="mb-4 flex flex-col space-y-3 rounded-2xl bg-[#f9e3aa] p-6 text-sm text-black">
      position
    </div>
  );
};
