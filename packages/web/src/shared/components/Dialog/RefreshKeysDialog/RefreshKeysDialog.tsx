export interface RefreshKeysDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RefreshKeysDialog = ({
  open: _open,
  onOpenChange: _onOpenChange,
}: RefreshKeysDialogProps) => {
  // Note: Node error tracking has been removed from the database migration
  // This dialog previously showed key mismatch errors for nodes
  // Since nodeErrors map is no longer available, we just return null
  // TODO: Reimplement node error tracking if needed for key mismatches
  return null;
};
