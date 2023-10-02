export interface ModalProps {
  title: string;
  actions?: JSX.Element[];
  children: React.ReactNode;
}

export const Modal = ({
  title,
  actions,
  children,
}: ModalProps): JSX.Element => {
  return (
    <div className="rounded-md overflow-hidden w-full">
      <div className="flex h-12 px-3 bg-slate-200 dark:bg-slate-700 justify-between">
        <h2 className="my-auto font-semibold text-lg">{title}</h2>
        {actions && (
          <div className="my-auto">{actions.map((action) => action)}</div>
        )}
      </div>
      <div className="h-full border border-slate-200 dark:border-slate-700">
        {children}
      </div>
    </div>
  );
};
