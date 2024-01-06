export interface DeviceSelectorButtonProps {
  active: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}

export const DeviceSelectorButton = ({
  active,
  onClick,
  children,
}: DeviceSelectorButtonProps): JSX.Element => (
  <li
    className="aspect-w-1 aspect-h-1 relative w-full"
    onClick={onClick}
    onKeyDown={onClick}
  >
    {active && (
      <div className="absolute -left-2 h-10 w-1.5 rounded-full bg-accent" />
    )}
    <div className="flex aspect-square cursor-pointer flex-col items-center justify-center">
      {children}
    </div>
  </li>
);
