import { DialogWrapper } from "@components/Dialog/DialogWrapper.tsx";
import { Button } from "@components/UI/Button.tsx";
import { Checkbox } from "@components/UI/Checkbox/index.tsx";
import {
  PROFILE_FIELDS,
  type ProfileField,
  type ProfileSelection,
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

/** Fields that exist in the file but are never applied on import. */
const NOT_IMPORTED: readonly ProfileField[] = ["isLicensed"];

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

  // A row the user can't select (unavailable, not imported, or the private
  // key without the configuration) doesn't count, even if still ticked.
  const isEnabled = (field: ProfileField) =>
    available[field] &&
    !(mode === "import" && NOT_IMPORTED.includes(field)) &&
    !(field === "privateKey" && !selection.config);

  const anySelected = PROFILE_FIELDS.some(
    (field) => selection[field] && isEnabled(field),
  );

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
      <div className="flex flex-col gap-3 border-y border-slate-200 py-4 dark:border-slate-700">
        {PROFILE_FIELDS.map((field) => {
          const notApplied = mode === "import" && NOT_IMPORTED.includes(field);
          // The key lives in the configuration's security section.
          const enabled = isEnabled(field);
          return (
            <div key={field} className="flex flex-col gap-1">
              <Checkbox
                checked={enabled && selection[field]}
                disabled={!enabled}
                onChange={(checked) => toggle(field, checked)}
              >
                {t(`settingsPages.backup.fields.${field}`)}
                {notApplied && available[field] && (
                  <span className="ml-2 text-slate-500 dark:text-slate-400">
                    ({t("settingsPages.backup.notApplied")})
                  </span>
                )}
              </Checkbox>
              {field === "privateKey" && available.privateKey && (
                <p
                  role="note"
                  className="ml-9 flex gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-2 text-xs"
                >
                  <TriangleAlertIcon className="size-4 shrink-0 text-amber-600" />
                  {mode === "import"
                    ? t("settingsPages.backup.privateKeyImportWarning")
                    : t("settingsPages.backup.privateKeyWarning")}
                </p>
              )}
              {field === "privateKey" &&
                mode === "export" &&
                available.privateKey &&
                !(enabled && selection.privateKey) && (
                  <p className="ml-9 text-xs text-slate-500 dark:text-slate-400">
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
