import { PkiRegenerateDialog } from "@components/Dialog/PkiRegenerateDialog.tsx";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useAppStore } from "@core/stores/appStore.ts";
import { getX25519PrivateKey, getX25519PublicKey } from "@core/utils/x25519.ts";
import type { SecurityValidation } from "@app/validation/config/security.ts";
import { create } from "@bufbuild/protobuf";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf } from "@meshtastic/core";
import { fromByteArray, toByteArray } from "base64-js";
import { useReducer } from "react";
import { securityReducer } from "@components/PageComponents/Config/Security/securityReducer.tsx";
import type { SecurityConfigInit } from "./types.ts";
import { useTranslation } from "react-i18next";

export const Security = () => {
  const { config, setWorkingConfig, setDialogOpen } = useDevice();
  const {
    hasErrors,
    getErrorMessage,
    hasFieldError,
    addError,
    removeError,
    clearErrors,
  } = useAppStore();
  const { t } = useTranslation("deviceConfig");

  const [state, dispatch] = useReducer(securityReducer, {
    privateKey: fromByteArray(config.security?.privateKey ?? new Uint8Array(0)),
    privateKeyVisible: false,
    adminKeyVisible: [false, false, false],
    privateKeyBitCount: config.security?.privateKey?.length ?? 32,
    publicKey: fromByteArray(config.security?.publicKey ?? new Uint8Array(0)),
    adminKey: [
      fromByteArray(config.security?.adminKey?.at(0) ?? new Uint8Array(0)),
      fromByteArray(config.security?.adminKey?.at(1) ?? new Uint8Array(0)),
      fromByteArray(config.security?.adminKey?.at(2) ?? new Uint8Array(0)),
    ],
    privateKeyDialogOpen: false,
    isManaged: config.security?.isManaged ?? false,
    adminChannelEnabled: config.security?.adminChannelEnabled ?? false,
    debugLogApiEnabled: config.security?.debugLogApiEnabled ?? false,
    serialEnabled: config.security?.serialEnabled ?? false,
  });

  const validateKey = (
    input: string,
    count: number,
    fieldName: "privateKey" | "adminKey",
    fieldIndex?: number,
  ) => {
    const fieldNameKey = fieldName + (fieldIndex ?? "");
    try {
      removeError(fieldNameKey);
      if (fieldName === "privateKey" && input === "") {
        addError(fieldNameKey, t("security.validation.privateKeyRequired"));
        return;
      }

      if (fieldName === "adminKey" && input === "") {
        if (
          state.isManaged &&
          state.adminKey
            .map((v, i) => (i === fieldIndex ? input : v))
            .every((s) => s === "")
        ) {
          addError("adminKey0", t("security."));
        }

        return;
      }

      if (input.length % 4 !== 0) {
        addError(
          fieldNameKey,
          fieldName === "privateKey"
            ? t("security.validation.privateKeyMustBe256BitPsk")
            : t("security.validation.adminKeyMustBe256BitPsk"),
        );
        return;
      }

      const decoded = toByteArray(input);
      if (decoded.length !== count) {
        addError(
          fieldNameKey,
          t("security.validation.enterValid256BitPsk", {
            bits: count * 8,
          }),
        );
        return;
      }
    } catch (e) {
      console.error(e);
      addError(
        fieldNameKey,
        fieldName === "privateKey"
          ? t("security.validation.invalidPrivateKeyFormat")
          : t("security.validation.invalidAdminKeyFormat"),
      );
    }
  };

  function setSecurityPayload(overrides: SecurityConfigInit) {
    const base: SecurityConfigInit = {
      isManaged: state.isManaged,
      adminChannelEnabled: state.adminChannelEnabled,
      debugLogApiEnabled: state.debugLogApiEnabled,
      serialEnabled: state.serialEnabled,
      privateKey: overrides?.privateKey ?? toByteArray(state.privateKey),
      publicKey: overrides?.publicKey ?? toByteArray(state.publicKey),
      adminKey: [
        overrides?.adminKey?.[0] ?? toByteArray(state.adminKey[0]),
        overrides?.adminKey?.[0] ?? toByteArray(state.adminKey[0]),
        overrides?.adminKey?.[0] ?? toByteArray(state.adminKey[0]),
      ],
    };

    setWorkingConfig(
      create(Protobuf.Config.ConfigSchema, {
        payloadVariant: {
          case: "security",
          value: { ...base, ...overrides },
        },
      }),
    );
  }

  const pkiRegenerate = () => {
    clearErrors();
    const privateKey = getX25519PrivateKey();
    const publicKey = getX25519PublicKey(privateKey);

    dispatch({
      type: "REGENERATE_PRIV_PUB_KEY",
      payload: {
        privateKey: fromByteArray(privateKey),
        publicKey: fromByteArray(publicKey),
      },
    });

    validateKey(
      fromByteArray(privateKey),
      state.privateKeyBitCount,
      "privateKey",
    );

    if (!hasErrors()) {
      setSecurityPayload({
        privateKey: privateKey,
        publicKey: publicKey,
      });
    }
  };

  const privateKeyInputChangeEvent = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const privateKeyB64String = e.target.value;
    dispatch({ type: "SET_PRIVATE_KEY", payload: privateKeyB64String });
    validateKey(privateKeyB64String, state.privateKeyBitCount, "privateKey");

    const publicKey = getX25519PublicKey(toByteArray(privateKeyB64String));
    dispatch({ type: "SET_PUBLIC_KEY", payload: fromByteArray(publicKey) });

    if (!hasErrors()) {
      setSecurityPayload({
        privateKey: toByteArray(privateKeyB64String),
        publicKey: publicKey,
      });
    }
  };

  const adminKeyInputChangeEvent = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldIndex?: number,
  ) => {
    if (fieldIndex === undefined) return;
    const psk = e.target.value;

    const payload = [
      fieldIndex === 0 ? psk : state.adminKey[0],
      fieldIndex === 1 ? psk : state.adminKey[1],
      fieldIndex === 2 ? psk : state.adminKey[2],
    ] satisfies [string, string, string];

    dispatch({ type: "SET_ADMIN_KEY", payload: payload });
    validateKey(psk, state.privateKeyBitCount, "adminKey", fieldIndex);

    if (!hasErrors()) {
      setSecurityPayload({
        adminKey: payload.map(toByteArray) as [
          Uint8Array,
          Uint8Array,
          Uint8Array,
        ],
      });
    }
  };

  const onToggleChange = (
    field:
      | "isManaged"
      | "adminChannelEnabled"
      | "debugLogApiEnabled"
      | "serialEnabled",
    next: boolean,
  ) => {
    dispatch({ type: "SET_TOGGLE", field, payload: next });

    if (field === "isManaged" && state.adminKey.every((s) => s === "")) {
      if (next) {
        // If enabling 'managed' and no admin keys are set
        addError(
          "adminKey0",
          t("security.validation.adminKeyRequiredWhenManaged"),
        );
      } else {
        removeError("adminKey0");
        removeError("adminKey1");
        removeError("adminKey2");
      }
    }

    if (!hasErrors()) {
      setSecurityPayload({
        isManaged: field === "isManaged" ? next : state.isManaged,
        adminChannelEnabled: field === "adminChannelEnabled"
          ? next
          : state.adminChannelEnabled,
        debugLogApiEnabled: field === "debugLogApiEnabled"
          ? next
          : state.debugLogApiEnabled,
        serialEnabled: field === "serialEnabled" ? next : state.serialEnabled,
      });
    }
  };

  return (
    <>
      <DynamicForm<SecurityValidation>
        onSubmit={() => {}}
        submitType="onSubmit"
        defaultValues={{
          ...config.security,
          ...{
            adminKey: state.adminKey,
            privateKey: state.privateKey,
            publicKey: state.publicKey,
            adminChannelEnabled: config.security?.adminChannelEnabled ?? false,
            isManaged: config.security?.isManaged ?? false,
            debugLogApiEnabled: config.security?.debugLogApiEnabled ?? false,
            serialEnabled: config.security?.serialEnabled ?? false,
          },
        }}
        fieldGroups={[
          {
            label: t("security.title"),
            description: t("security.description"),
            fields: [
              {
                type: "passwordGenerator",
                id: "pskInput",
                name: "privateKey",
                label: t("security.privateKey.label"),
                description: t("security.privateKey.description"),
                bits: [
                  {
                    text: t("security.256bit"),
                    value: "32",
                    key: "bit256",
                  },
                ],
                validationText: hasFieldError("privateKey")
                  ? getErrorMessage("privateKey")
                  : "",
                devicePSKBitCount: state.privateKeyBitCount,
                inputChange: privateKeyInputChangeEvent,
                selectChange: () => {},
                hide: !state.privateKeyVisible,
                actionButtons: [
                  {
                    text: t("button.generate"),
                    onClick: () =>
                      dispatch({
                        type: "SHOW_PRIVATE_KEY_DIALOG",
                        payload: true,
                      }),
                    variant: "success",
                  },
                  {
                    text: t("button.backupKey"),
                    onClick: () => setDialogOpen("pkiBackup", true),
                    variant: "subtle",
                  },
                ],
                properties: {
                  value: state.privateKey,
                  showCopyButton: true,
                  showPasswordToggle: true,
                },
              },
              {
                type: "text",
                name: "publicKey",
                label: t("security.publicKey.label"),
                disabled: true,
                description: t("security.publicKey.description"),
                properties: {
                  value: state.publicKey,
                  showCopyButton: true,
                },
              },
            ],
          },
          {
            label: t("security.adminSettings.label"),
            description: t("security.adminSettings.description"),
            fields: [
              {
                type: "passwordGenerator",
                name: "adminKey.0",
                id: "adminKey0Input",
                label: t("security.primaryAdminKey.label"),
                description: t("security.primaryAdminKey.description"),
                validationText: hasFieldError("adminKey0")
                  ? getErrorMessage("adminKey0")
                  : "",
                inputChange: (e) => adminKeyInputChangeEvent(e, 0),
                selectChange: () => {},
                bits: [
                  {
                    text: t("security.256bit"),
                    value: "32",
                    key: "bit256",
                  },
                ],
                devicePSKBitCount: state.privateKeyBitCount,
                hide: !state.adminKeyVisible[0],
                actionButtons: [],
                disabledBy: [
                  { fieldName: "adminChannelEnabled", invert: true },
                ],
                properties: {
                  value: state.adminKey[0],
                  showCopyButton: true,
                  showPasswordToggle: true,
                },
              },
              {
                type: "passwordGenerator",
                name: "adminKey.1",
                id: "adminKey1Input",
                label: t("security.secondaryAdminKey.label"),
                description: t("security.secondaryAdminKey.description"),
                validationText: hasFieldError("adminKey1")
                  ? getErrorMessage("adminKey1")
                  : "",
                inputChange: (e) => adminKeyInputChangeEvent(e, 1),
                selectChange: () => {},
                bits: [
                  {
                    text: t("security.256bit"),
                    value: "32",
                    key: "bit256",
                  },
                ],
                devicePSKBitCount: state.privateKeyBitCount,
                hide: !state.adminKeyVisible[1],
                actionButtons: [],
                disabledBy: [
                  { fieldName: "adminChannelEnabled", invert: true },
                ],
                properties: {
                  value: state.adminKey[1],
                  showCopyButton: true,
                  showPasswordToggle: true,
                },
              },
              {
                type: "passwordGenerator",
                name: "adminKey.2",
                id: "adminKey2Input",
                label: t("security.tertiaryAdminKey.label"),
                description: t("security.tertiaryAdminKey.description"),
                validationText: hasFieldError("adminKey2")
                  ? getErrorMessage("adminKey2")
                  : "",
                inputChange: (e) => adminKeyInputChangeEvent(e, 2),
                selectChange: () => {},
                bits: [
                  {
                    text: t("security.256bit"),
                    value: "32",
                    key: "bit256",
                  },
                ],
                devicePSKBitCount: state.privateKeyBitCount,
                hide: !state.adminKeyVisible[2],
                actionButtons: [],
                disabledBy: [
                  { fieldName: "adminChannelEnabled", invert: true },
                ],
                properties: {
                  value: state.adminKey[2],
                  showCopyButton: true,
                  showPasswordToggle: true,
                },
              },
              {
                type: "toggle",
                name: "isManaged",
                label: t("security.managed.label"),
                description: t("security.managed.description"),
                inputChange: (e: boolean) => onToggleChange("isManaged", e),
                properties: {
                  checked: state.isManaged,
                },
                disabled: (hasFieldError("adminKey0") ||
                  hasFieldError("adminKey1") ||
                  hasFieldError("adminKey2")) &&
                  !state.adminKey.every((s) => s === ""),
              },
              {
                type: "toggle",
                name: "adminChannelEnabled",
                label: t("security.adminChannelEnabled.label"),
                description: t("security.adminChannelEnabled.description"),
                inputChange: (e: boolean) =>
                  onToggleChange("adminChannelEnabled", e),
                properties: {
                  checked: state.adminChannelEnabled,
                },
              },
            ],
          },
          {
            label: t("security.loggingSettings.label"),
            description: t("security.loggingSettings.description"),
            fields: [
              {
                type: "toggle",
                name: "debugLogApiEnabled",
                label: t("security.enableDebugLogApi.label"),
                description: t("security.enableDebugLogApi.description"),
                inputChange: (e: boolean) =>
                  onToggleChange("debugLogApiEnabled", e),
                properties: {
                  checked: state.debugLogApiEnabled,
                },
              },
              {
                type: "toggle",
                name: "serialEnabled",
                label: t("security.serialOutputEnabled.label"),
                description: t("security.serialOutputEnabled.description"),
                inputChange: (e: boolean) => onToggleChange("serialEnabled", e),
                properties: {
                  checked: state.serialEnabled,
                },
              },
            ],
          },
        ]}
      />
      <PkiRegenerateDialog
        text={{
          button: t("button.regenerate"),
          title: t("pkiRegenerate.title"),
          description: t("pkiRegenerate.description"),
        }}
        open={state.privateKeyDialogOpen}
        onOpenChange={() =>
          dispatch({ type: "SHOW_PRIVATE_KEY_DIALOG", payload: false })}
        onSubmit={pkiRegenerate}
      />
    </>
  );
};
