import type React from "react";

export const Dialog = ({
  children,
  open,
}: {
  children: React.ReactNode;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}) => (open ? <div data-testid="dialog">{children}</div> : null);

export const DialogContent = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div data-testid="dialog-content" className={className}>
    {children}
  </div>
);

export const DialogHeader = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="dialog-header">{children}</div>
);

export const DialogTitle = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="dialog-title">{children}</div>
);

export const DialogDescription = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div data-testid="dialog-description" className={className}>
    {children}
  </div>
);

export const DialogFooter = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div data-testid="dialog-footer" className={className}>
    {children}
  </div>
);
