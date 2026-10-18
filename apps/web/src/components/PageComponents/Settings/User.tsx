import {
  NODE_STATUS_MAX_BYTES,
  type UserValidation,
  UserValidationSchema,
} from "@app/validation/config/user.ts";
import { create } from "@bufbuild/protobuf";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { useDeviceCapabilities } from "@core/hooks/useDeviceCapabilities.ts";
import { useMyNodeAsProto } from "@core/hooks/useNodesAsProto.ts";
import { useDevice } from "@core/stores";
import { isModuleExcluded } from "@core/utils/excludedModules.ts";
import { firmwareAtLeast, Protobuf } from "@meshtastic/sdk";
import { useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

interface UserConfigProps {
  onFormInit: DynamicFormFormInit<UserValidation>;
}

const EMPTY_OWNER_SIGNAL = {
  value: undefined as Protobuf.Mesh.User | undefined,
  peek: () => undefined as Protobuf.Mesh.User | undefined,
  subscribe: () => () => {},
} as const;

const EMPTY_MODULES_SIGNAL = {
  value: {} as {
    statusmessage?: Protobuf.ModuleConfig.ModuleConfig_StatusMessageConfig;
  },
  peek: () =>
    ({}) as {
      statusmessage?: Protobuf.ModuleConfig.ModuleConfig_StatusMessageConfig;
    },
  subscribe: () => () => {},
} as const;

export const User = ({ onFormInit }: UserConfigProps) => {
  const { t } = useTranslation("config");
  const editor = useConfigEditor();
  const myNode = useMyNodeAsProto();
  const owner = useSignal(editor?.owner ?? EMPTY_OWNER_SIGNAL);
  const modules = useSignal(editor?.modules ?? EMPTY_MODULES_SIGNAL);
  const { moduleConfig, getEffectiveModuleConfig } = useDevice();
  const { metadata, supportsFirmware28, excludedModules } =
    useDeviceCapabilities();

  // The Status Message module's one field lives here, as on Android: from
  // firmware 2.7.20, unless the build leaves the module out. It also waits
  // for the module's config, so an edit is never shown but not staged.
  const supportsStatusMessage =
    (supportsFirmware28 ||
      firmwareAtLeast(metadata?.firmwareVersion ?? "", "2.7.20")) &&
    !isModuleExcluded(excludedModules, "statusmessage");
  const showStatusMessage =
    supportsStatusMessage && moduleConfig.statusmessage !== undefined;
  const baselineStatus = moduleConfig.statusmessage?.nodeStatus ?? "";
  const effectiveStatus =
    modules.statusmessage?.nodeStatus ??
    getEffectiveModuleConfig("statusmessage")?.nodeStatus ??
    baselineStatus;

  // Seed the editor's baseline when the device's user info first arrives.
  // setBaselineOwner is a no-op when the working copy is dirty, so user
  // edits in flight are preserved across re-renders.
  useEffect(() => {
    if (editor && myNode?.user) {
      editor.setBaselineOwner(myNode.user);
    }
  }, [editor, myNode?.user]);

  const baselineUser =
    myNode?.user ??
    create(Protobuf.Mesh.UserSchema, {
      id: "",
      longName: "",
      shortName: "",
      isLicensed: false,
    });
  const effectiveUser = owner ?? baselineUser;

  const onSubmit = (data: UserValidation) => {
    if (!editor) return;
    // Preserve fields the form doesn't edit (id, hwModel, role, publicKey, etc.).
    const merged = create(Protobuf.Mesh.UserSchema, {
      ...baselineUser,
      longName: data.longName,
      shortName: data.shortName,
      isUnmessagable: data.isUnmessageable,
      isLicensed: data.isLicensed,
    });
    editor.setOwner(merged);
    // Only stage the status once the device has sent the module's config,
    // so a node without it never gets a new, dirty section.
    if (showStatusMessage) {
      editor.setModuleSection(
        "statusmessage",
        create(Protobuf.ModuleConfig.ModuleConfig_StatusMessageConfigSchema, {
          nodeStatus: data.nodeStatus,
        }),
      );
    }
  };

  const hwName =
    Protobuf.Mesh.HardwareModel[baselineUser.hwModel] ??
    String(baselineUser.hwModel);

  return (
    <DynamicForm<UserValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={UserValidationSchema}
      defaultValues={{
        nodeId: baselineUser.id,
        hardwareModel: hwName,
        longName: baselineUser.longName,
        shortName: baselineUser.shortName,
        isLicensed: baselineUser.isLicensed,
        isUnmessageable: baselineUser.isUnmessagable ?? false,
        nodeStatus: baselineStatus,
      }}
      values={{
        nodeId: effectiveUser.id,
        hardwareModel: hwName,
        longName: effectiveUser.longName,
        shortName: effectiveUser.shortName,
        isLicensed: effectiveUser.isLicensed,
        isUnmessageable: effectiveUser.isUnmessagable ?? false,
        nodeStatus: effectiveStatus,
      }}
      fieldGroups={[
        {
          label: t("user.userConfig.label"),
          description: t("user.userConfig.description"),
          fields: [
            {
              type: "text",
              name: "nodeId",
              label: t("user.nodeId.label"),
              description: t("user.nodeId.description"),
              disabled: true,
              properties: {
                showCopyButton: true,
              },
            },
            {
              type: "text",
              name: "longName",
              label: t("user.longName.label"),
              description: t("user.longName.description"),
              properties: {
                fieldLength: { min: 1, max: 39, showCharacterCount: true },
              },
            },
            {
              type: "text",
              name: "shortName",
              label: t("user.shortName.label"),
              description: t("user.shortName.description"),
              properties: {
                fieldLength: { min: 1, max: 4, showCharacterCount: true },
              },
            },
            ...(showStatusMessage
              ? [
                  {
                    type: "text" as const,
                    name: "nodeStatus" as const,
                    label: t("user.statusMessage.label"),
                    description: t("user.statusMessage.description"),
                    properties: {
                      fieldLength: {
                        max: NODE_STATUS_MAX_BYTES,
                        showCharacterCount: true,
                      },
                    },
                  },
                ]
              : []),
            {
              type: "text",
              name: "hardwareModel",
              label: t("user.hardwareModel.label"),
              description: t("user.hardwareModel.description"),
              disabled: true,
            },
            {
              type: "toggle",
              name: "isUnmessageable",
              label: t("user.isUnmessageable.label"),
              description: t("user.isUnmessageable.description"),
            },
            {
              type: "toggle",
              name: "isLicensed",
              label: t("user.isLicensed.label"),
              description: t("user.isLicensed.description"),
            },
          ],
        },
      ]}
    />
  );
};
