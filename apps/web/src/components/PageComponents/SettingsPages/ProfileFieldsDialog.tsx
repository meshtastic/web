import { DialogWrapper } from "@components/Dialog/DialogWrapper.tsx";
import { Button } from "@components/UI/Button.tsx";
import { Checkbox } from "@components/UI/Checkbox/index.tsx";
import {
  anyFieldSelected,
  type ProfileField,
  type ProfileSelection,
  profileFieldRows,
} from "@core/utils/profileExport.ts";
import { TriangleAlertIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export interface ProfileFieldsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "export" | "import";
  /** Which parts exist; the others are shown disabled. */
  available: ProfileSelection;
  /** The starting selection; the private key should start unchecked. */
  initial: ProfileSelection;
  onConfirm: (selection: ProfileSelection) => void;
}

/**
 * Android's EditDeviceProfileDialog: pick which parts of a profile to export
 * or import. The private key is opt-in and carries a warning.
 */
export const ProfileFieldsDialog = ({
  open,
  onOpenChange,
  mode,
  available,
  initial,
  onConfirm,
}: ProfileFieldsDialogProps) => {
  const { t } = useTranslation("ui");
  // Mount the dialog per profile: the selection starts from `initial` once.
  const [selection, setSelection] = useState<ProfileSelection>(initial);

  const toggle = (field: ProfileField, checked: boolean) =>
    setSelection((current) => ({ ...current, [field]: checked }));

  const rows = profileFieldRows(mode, available, selection);
  const anySelected = anyFieldSelected(rows);

  return (
    <DialogWrapper
      open={open}
      onOpenChange={onOpenChange}
      type="custom"
      title={t(`settingsPages.backup.${mode}.dialogTitle`)}
      description={t(`settingsPages.backup.${mode}.dialogDescription`)}
      customFooter={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common:button.cancel")}
          </Button>
          <Button
            disabled={!anySelected}
            onClick={() => {
              onConfirm(selection);
              onOpenChange(false);
            }}
          >
            {t(`settingsPages.backup.${mode}.confirm`)}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 border-y border-subtle py-4">
        {rows.map(({ field, enabled, checked, notApplied }) => {
          return (
            <div key={field} className="flex flex-col gap-1">
              <Checkbox
                checked={checked}
                disabled={!enabled}
                onChange={(checked) => toggle(field, checked)}
              >
                {t(`settingsPages.backup.fields.${field}`)}
                {notApplied && available[field] && (
                  <span className="ml-2 text-muted">
                    ({t("settingsPages.backup.notApplied")})
                  </span>
                )}
              </Checkbox>
              {field === "privateKey" && available.privateKey && (
                <p
                  role="note"
                  className="ml-9 flex gap-2 rounded-md border border-warning bg-warning p-2 text-meta text-warning"
                >
                  <TriangleAlertIcon className="size-4 shrink-0" />
                  {mode === "import"
                    ? t("settingsPages.backup.privateKeyImportWarning")
                    : t("settingsPages.backup.privateKeyWarning")}
                </p>
              )}
              {field === "privateKey" &&
                mode === "export" &&
                available.privateKey &&
                !checked && (
                  <p className="ml-9 text-meta text-muted">
                    {t("settingsPages.backup.privateKeyExcludedNote")}
                  </p>
                )}
            </div>
          );
        })}
      </div>
    </DialogWrapper>
  );
};
