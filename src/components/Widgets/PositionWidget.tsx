import { MapPinIcon } from "@heroicons/react/24/outline";

export interface PositionWidgetProps {
  grid: string;
}

export const PositionWidget = ({ grid }: PositionWidgetProps): JSX.Element => {
  return (
    <div className="flex gap-3 overflow-hidden rounded-lg bg-backgroundPrimary p-3 text-textSecondary">
      <div className="rounded-md bg-accent p-3 text-textPrimary">
        <MapPinIcon className="text-white h-6" />
      </div>
      <div>
        <p className="truncate text-sm font-medium">Current Location</p>
        <div className="flex gap-1">
          <p className="text-lg font-semibold">{grid}</p>
        </div>
      </div>
    </div>
  );
};
