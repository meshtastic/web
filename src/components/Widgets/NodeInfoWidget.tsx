import type React from "react";

export interface NodeInfoWidgetProps {}

export const NodeInfoWidget = ({}: NodeInfoWidgetProps): JSX.Element => {
  return (
    <div className="p-6 flex flex-col rounded-2xl mb-4 text-sm space-y-3 bg-[#f9e3aa] text-black">
      node info
    </div>
  );
};
