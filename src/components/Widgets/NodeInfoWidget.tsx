import type React from "react";

export interface NodeInfoWidgetProps {}

export const NodeInfoWidget = ({}: NodeInfoWidgetProps): JSX.Element => {
  return (
    <div className="mb-4 flex flex-col space-y-3 rounded-2xl bg-[#f9e3aa] p-6 text-sm text-black">
      node info
    </div>
  );
};
