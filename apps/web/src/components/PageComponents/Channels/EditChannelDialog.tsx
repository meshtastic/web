import {
  makeChannelSchema,
  POSITION_PRECISION_MAX,
  POSITION_PRECISION_MIN,
  POSITION_PRECISION_OFF,
  POSITION_PRECISION_PRECISE,
} from "@app/validation/channel.ts";
import { Button } from "@components/UI/Button.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { Generator } from "@components/UI/Generator.tsx";
import { Input } from "@components/UI/Input.tsx";
import { Label } from "@components/UI/Label.tsx";
import { Slider } from "@components/UI/Slider.tsx";
import { Switch } from "@components/UI/Switch.tsx";
import type { Protobuf } from "@meshtastic/sdk";
import { type ReactNode, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  applyChannelNameEdit,
  buildEditedChannel,
  type ChannelDraft,
  draftFromChannel,
  generatePsk,
  markPskEdited,
  POSITION_PRECISION_DEFAULT,
  type PskEditState,
  precisionLabelKey,
  pskByteLength,
} from "./channelStaging.ts";

const PSK_BYTE_LENGTHS = [0, 1, 16, 32];

export interface EditChannelDialogProps {
  /** The channel being edited, or the new channel being added. */
  channel: Protobuf.Channel.Channel;
  isNew: boolean;
  initialPskState: PskEditState;
  /** Shown in the name field while it's empty. */
  defaultName: string;
  /** Show distances in metric units. */
  metric: boolean;
  /** Stage the channel. */
  onSave: (channel: Protobuf.Channel.Channel) => void;
  onClose: () => void;
}

function initialByteCount(psk: string): number {
  const length = pskByteLength(psk);
  return length !== undefined && PSK_BYTE_LENGTHS.includes(length)
    ? length
    : 32;
}

function SwitchRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor={id}>{label}</Label>
        {description && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="text-sm text-red-500 dark:text-red-400">{children}</p>;
}

/**
 * Edit one channel (Android's EditChannelDialog). OK stages the channel in the
 * config editor; nothing is sent until the page's Save.
 */
export function EditChannelDialog({
  channel,
  isNew,
  initialPskState,
  defaultName,
  metric,
  onSave,
  onClose,
}: EditChannelDialogProps) {
  const { t } = useTranslation("channels");
  const id = useId();
  const [draft, setDraft] = useState<ChannelDraft>(() =>
    draftFromChannel(channel),
  );
  const [pskState, setPskState] = useState<PskEditState>(initialPskState);
  const [byteCount, setByteCount] = useState(() =>
    initialByteCount(draftFromChannel(channel).psk),
  );

  const errors = useMemo(() => {
    const result = makeChannelSchema(byteCount).safeParse(draft);
    const byField: Partial<Record<keyof ChannelDraft, string>> = {};
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ChannelDraft;
        byField[field] ??= t(issue.message, {
          ns: "common",
          params: (issue as { params?: unknown }).params,
        });
      }
    }
    return byField;
  }, [draft, byteCount, t]);
  const isValid = Object.keys(errors).length === 0;

  const update = (patch: Partial<ChannelDraft>) =>
    setDraft((current) => ({ ...current, ...patch }));

  const setPsk = (psk: string) => {
    update({ psk });
    setPskState(markPskEdited);
    const length = pskByteLength(psk);
    if (length !== undefined && PSK_BYTE_LENGTHS.includes(length)) {
      setByteCount(length);
    }
  };

  const onNameChange = (name: string) => {
    const next = applyChannelNameEdit(draft, name, pskState);
    setDraft(next.draft);
    setPskState(next.state);
    if (next.draft.psk !== draft.psk) {
      setByteCount(initialByteCount(next.draft.psk));
    }
  };

  const onGenerate = () => {
    const bytes = byteCount >= 16 ? byteCount : 32;
    setPsk(generatePsk(bytes));
  };

  const precision = draft.positionPrecision;
  const positionEnabled = precision !== POSITION_PRECISION_OFF;
  const precise = precision === POSITION_PRECISION_PRECISE;

  const save = () => {
    if (!isValid) return;
    onSave(buildEditedChannel(channel, draft));
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh]">
        <DialogClose />
        <DialogHeader>
          <DialogTitle>
            {isNew
              ? t("editDialog.addTitle")
              : t("editDialog.editTitle", { index: channel.index })}
          </DialogTitle>
          <DialogDescription>{t("editDialog.description")}</DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-name`}>{t("name.label")}</Label>
            <Input
              id={`${id}-name`}
              value={draft.name}
              placeholder={defaultName}
              variant={errors.name ? "invalid" : "default"}
              onChange={(e) => onNameChange(e.target.value)}
            />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("name.description")}
            </p>
            <FieldError>{errors.name}</FieldError>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-psk`}>{t("psk.label")}</Label>
            <div className="flex">
              <Generator
                type="password"
                id={`${id}-psk`}
                value={draft.psk}
                variant={errors.psk ? "invalid" : "default"}
                devicePSKBitCount={byteCount}
                selectChange={(value) => {
                  const count = Number.parseInt(value, 10);
                  if (!Number.isNaN(count)) setByteCount(count);
                }}
                inputChange={(e) => setPsk(e.target.value)}
                actionButtons={[
                  {
                    text: t("psk.generate"),
                    variant: "success",
                    onClick: onGenerate,
                  },
                ]}
                showPasswordToggle
                showCopyButton
              />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("psk.description")}
            </p>
            <FieldError>{errors.psk}</FieldError>
          </div>

          <SwitchRow
            id={`${id}-uplink`}
            label={t("uplinkEnabled.label")}
            description={t("uplinkEnabled.description")}
            checked={draft.uplinkEnabled}
            onCheckedChange={(uplinkEnabled) => update({ uplinkEnabled })}
          />
          <SwitchRow
            id={`${id}-downlink`}
            label={t("downlinkEnabled.label")}
            description={t("downlinkEnabled.description")}
            checked={draft.downlinkEnabled}
            onCheckedChange={(downlinkEnabled) => update({ downlinkEnabled })}
          />

          <SwitchRow
            id={`${id}-position`}
            label={t("positionEnabled.label")}
            description={t("positionEnabled.description")}
            checked={positionEnabled}
            onCheckedChange={(on) =>
              update({
                positionPrecision: on
                  ? POSITION_PRECISION_PRECISE
                  : POSITION_PRECISION_OFF,
              })
            }
          />
          {positionEnabled && (
            <SwitchRow
              id={`${id}-precise`}
              label={t("preciseLocation.label")}
              checked={precise}
              onCheckedChange={(on) =>
                update({
                  positionPrecision: on
                    ? POSITION_PRECISION_PRECISE
                    : POSITION_PRECISION_DEFAULT,
                })
              }
            />
          )}
          {positionEnabled && !precise && (
            <div className="flex flex-col gap-3">
              <Label htmlFor={`${id}-precision`}>
                {t("positionPrecision.label")}
              </Label>
              <Slider
                id={`${id}-precision`}
                min={POSITION_PRECISION_MIN}
                max={POSITION_PRECISION_MAX}
                step={1}
                value={[precision]}
                onValueChange={([value]) => {
                  if (value !== undefined) update({ positionPrecision: value });
                }}
              />
              <p className="text-center text-sm" aria-live="polite">
                {t(precisionLabelKey(precision, metric))}
              </p>
              <FieldError>{errors.positionPrecision}</FieldError>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("button.cancel", { ns: "common" })}
            </Button>
            <Button type="submit" disabled={!isValid}>
              {t("button.ok", { ns: "common" })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
