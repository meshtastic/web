import { create } from "@bufbuild/protobuf";
import { ProfileFieldsDialog } from "@components/PageComponents/SettingsPages/ProfileFieldsDialog.tsx";
import {
  SettingsGroup,
  SettingsRow,
  SettingsSections,
} from "@components/PageComponents/SettingsPages/SettingsSection.tsx";
import { useDeviceConnected } from "@components/PageComponents/SettingsPages/useDeviceConnected.ts";
import { Button } from "@components/UI/Button.tsx";
import { Subtle } from "@components/UI/Typography/Subtle.tsx";
import { STAGED_FIXED_POSITION } from "@core/utils/stagedAdminKeys.ts";
import { useToast } from "@core/hooks/useToast.ts";
import {
  buildDeviceProfile,
  decodeDeviceProfile,
  defaultSelection,
  deviceProfileFileName,
  encodeDeviceProfile,
  type ImportPlan,
  planProfileImport,
  type ProfileSelection,
  profileContents,
  selectProfileFields,
} from "@core/utils/profileExport.ts";
import { type ConfigEditor, Protobuf } from "@meshtastic/sdk";
import {
  useActiveClient,
  useConfigEditor,
  useSignal,
} from "@meshtastic/sdk-react";
import { Result } from "better-result";
import { DownloadIcon, UploadIcon } from "lucide-react";
import { type ChangeEvent, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { type ConfigProps, SettingsCard } from "./SettingsTabs.tsx";

type DeviceProfile = Protobuf.ClientOnly.DeviceProfile;

const EMPTY_BOOLEAN_SIGNAL = {
  value: false,
  peek: () => false,
  subscribe: () => () => {},
} as const;

type PendingDialog =
  | { mode: "export"; profile: DeviceProfile }
  | { mode: "import"; profile: DeviceProfile };

const downloadBytes = (bytes: Uint8Array, fileName: string) => {
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], {
    type: "application/octet-stream",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  // Revoke after the click has been handled.
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

const applyPlan = (editor: ConfigEditor, plan: ImportPlan) => {
  if (plan.owner) editor.setOwner(plan.owner);
  for (const [key, value] of Object.entries(plan.radio)) {
    editor.setRadioSection(
      key as keyof ImportPlan["radio"],
      value as NonNullable<ImportPlan["radio"][keyof ImportPlan["radio"]]>,
    );
  }
  for (const [key, value] of Object.entries(plan.modules)) {
    editor.setModuleSection(
      key as keyof ImportPlan["modules"],
      value as NonNullable<ImportPlan["modules"][keyof ImportPlan["modules"]]>,
    );
  }
  for (const channel of plan.channels) editor.setChannel(channel);
  if (plan.fixedPosition) {
    // Same key as the Position page, so only one fixed position is sent;
    // Reset drops it and a later edit or import replaces it.
    editor.stageAdminMessage(
      STAGED_FIXED_POSITION,
      create(Protobuf.Admin.AdminMessageSchema, {
        payloadVariant: { case: "setFixedPosition", value: plan.fixedPosition },
      }),
    );
  }
};

/**
 * Android's Import / Export configuration: a `.cfg` device profile, with a
 * dialog to choose what goes in or out. Imports are staged in the editor and
 * written only when the user presses Save.
 */
export const BackupRestore = (_props: ConfigProps) => {
  const { t } = useTranslation("ui");
  const { toast } = useToast();
  const client = useActiveClient();
  const editor = useConfigEditor();
  const isDirty = useSignal(editor?.isDirty ?? EMPTY_BOOLEAN_SIGNAL);
  const connected = useDeviceConnected();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingDialog>();

  const myNode = () => {
    const myNodeNum = client?.device.myNodeNum.peek();
    return myNodeNum === undefined ? undefined : client?.nodes.byNum(myNodeNum);
  };

  const startExport = () => {
    if (!editor) return;
    const profile = buildDeviceProfile({
      owner: editor.owner.peek() ?? myNode()?.user,
      radio: editor.radio.peek(),
      modules: editor.modules.peek(),
      channels: editor.channels.peek().values(),
      ownPosition: myNode()?.position,
    });
    setPending({ mode: "export", profile });
  };

  const finishExport = (
    profile: DeviceProfile,
    selection: ProfileSelection,
  ) => {
    try {
      const selected = selectProfileFields(profile, selection);
      downloadBytes(
        encodeDeviceProfile(selected),
        deviceProfileFileName(
          selected.longName,
          selected.shortName,
          new Date(),
        ),
      );
    } catch {
      toast({ title: t("settingsPages.backup.export.failed") });
    }
  };

  const onFileChosen = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const decoded = decodeDeviceProfile(
      new Uint8Array(await file.arrayBuffer()),
    );
    if (Result.isError(decoded)) {
      toast({
        title: t("settingsPages.backup.import.failed"),
        description: t("settingsPages.backup.import.invalidFile"),
      });
      return;
    }
    setPending({ mode: "import", profile: decoded.value });
  };

  const finishImport = (
    profile: DeviceProfile,
    selection: ProfileSelection,
  ) => {
    if (!editor) {
      toast({ title: t("settingsPages.backup.import.notConnected") });
      return;
    }
    // The User page loads the owner into the editor only when opened.
    const nodeUser = myNode()?.user;
    if (!editor.owner.peek() && nodeUser) editor.setBaselineOwner(nodeUser);

    const plan = planProfileImport(selectProfileFields(profile, selection), {
      owner: editor.owner.peek(),
      security: editor.radio.peek().security,
      activeChannelIndexes: [...editor.channels.peek().values()]
        .filter((ch) => ch.role !== Protobuf.Channel.Channel_Role.DISABLED)
        .map((ch) => ch.index),
    });
    if (Result.isError(plan)) {
      toast({
        title: t("settingsPages.backup.import.failed"),
        description: t("settingsPages.backup.import.invalidChannels"),
      });
      return;
    }

    applyPlan(editor, plan.value);
    const skipped = [...new Set(plan.value.skipped)].map((key) =>
      t(`settingsPages.backup.skipped.${key}`),
    );
    toast({
      title: t("settingsPages.backup.import.staged"),
      description: [
        t("settingsPages.backup.import.stagedDescription"),
        skipped.length > 0
          ? `${t("settingsPages.backup.skipped.title")} ${skipped.join(", ")}`
          : "",
      ]
        .filter(Boolean)
        .join(" "),
    });
  };

  const available = useMemo(
    () => (pending ? profileContents(pending.profile) : undefined),
    [pending],
  );
  const initial = useMemo(
    () => (pending ? defaultSelection(pending.profile) : undefined),
    [pending],
  );

  return (
    <SettingsCard>
      <SettingsSections>
        <SettingsGroup
          title={t("settingsPages.backup.title")}
          description={t("settingsPages.backup.description")}
        >
          {!connected && (
            <Subtle className="font-semibold">
              {t("settingsPages.notConnected")}
            </Subtle>
          )}
          <SettingsRow
            label={t("settingsPages.backup.import.label")}
            description={t("settingsPages.backup.import.description")}
          >
            <Button
              variant="outline"
              disabled={!connected}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadIcon className="mr-2 size-4" />
              {t("settingsPages.backup.import.action")}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".cfg,application/octet-stream"
              className="hidden"
              onChange={(event) => void onFileChosen(event)}
            />
          </SettingsRow>
          <SettingsRow
            label={t("settingsPages.backup.export.label")}
            description={
              <>
                {t("settingsPages.backup.export.description")}
                {isDirty && (
                  <span className="mt-1 block font-semibold text-amber-600 dark:text-amber-400">
                    {t("settingsPages.backup.export.pendingChanges")}
                  </span>
                )}
              </>
            }
          >
            <Button
              variant="outline"
              disabled={!connected || isDirty}
              onClick={startExport}
            >
              <DownloadIcon className="mr-2 size-4" />
              {t("settingsPages.backup.export.action")}
            </Button>
          </SettingsRow>
        </SettingsGroup>
      </SettingsSections>

      {pending && available && initial && (
        <ProfileFieldsDialog
          open
          onOpenChange={(open) => {
            if (!open) setPending(undefined);
          }}
          mode={pending.mode}
          available={available}
          initial={initial}
          onConfirm={(selection) =>
            pending.mode === "export"
              ? finishExport(pending.profile, selection)
              : finishImport(pending.profile, selection)
          }
        />
      )}
    </SettingsCard>
  );
};
