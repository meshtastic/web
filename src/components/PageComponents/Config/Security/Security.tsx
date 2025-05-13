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
        addError(fieldNameKey, "Private Key is required");
        return;
      }

      if (fieldName === "adminKey" && input === "") {
        return;
      }

      if (input.length % 4 !== 0) {
        addError(
          fieldNameKey,
          `${
            fieldName === "privateKey" ? "Private" : "Admin"
          } Key is required to be a 256 bit pre-shared key (PSK)`,
        );
        return;
      }

      const decoded = toByteArray(input);
      if (decoded.length !== count) {
        addError(fieldNameKey, `Please enter a valid ${count * 8} bit PSK`);
        return;
      }
    } catch (e) {
      console.error(e);
      addError(
        fieldNameKey,
        `Invalid ${
          fieldName === "privateKey" ? "Private" : "Admin"
        } Key format`,
      );
    }
  };

  const onSubmit = (data: SecurityValidation) => {
    if (hasErrors()) {
      return;
    }

    setWorkingConfig(
      create(Protobuf.Config.ConfigSchema, {
        payloadVariant: {
          case: "security",
          value: {
            ...data,
            adminKey: [
              toByteArray(state.adminKey[0]),
              toByteArray(state.adminKey[1]),
              toByteArray(state.adminKey[2]),
            ],
            privateKey: toByteArray(state.privateKey),
            publicKey: toByteArray(state.publicKey),
          },
        },
      }),
    );
  };

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
  };

  const privateKeyInputChangeEvent = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const privateKeyB64String = e.target.value;
    dispatch({ type: "SET_PRIVATE_KEY", payload: privateKeyB64String });
    validateKey(privateKeyB64String, state.privateKeyBitCount, "privateKey");

    const publicKey = getX25519PublicKey(toByteArray(privateKeyB64String));
    dispatch({ type: "SET_PUBLIC_KEY", payload: fromByteArray(publicKey) });
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
  };

  const privateKeySelectChangeEvent = (e: string) => {
    const count = Number.parseInt(e);
    dispatch({ type: "SET_PRIVATE_KEY_BIT_COUNT", payload: count });
    validateKey(state.privateKey, count, "privateKey");
  };

  return (
    <>
      <DynamicForm<SecurityValidation>
        onSubmit={onSubmit}
        submitType="onChange"
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
            label: "Security Settings",
            description: "Settings for the Security configuration",
            fields: [
              {
                type: "passwordGenerator",
                id: "pskInput",
                name: "privateKey",
                label: "Private Key",
                description: "Used to create a shared key with a remote device",
                bits: [{ text: "256 bit", value: "32", key: "bit256" }],
                validationText: hasFieldError("privateKey")
                  ? getErrorMessage("privateKey")
                  : "",
                devicePSKBitCount: state.privateKeyBitCount,
                inputChange: privateKeyInputChangeEvent,
                selectChange: privateKeySelectChangeEvent,
                hide: !state.privateKeyVisible,
                actionButtons: [
                  {
                    text: "Generate",
                    onClick: () =>
                      dispatch({
                        type: "SHOW_PRIVATE_KEY_DIALOG",
                        payload: true,
                      }),
                    variant: "success",
                  },
                  {
                    text: "Backup Key",
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
                label: "Public Key",
                disabled: true,
                description:
                  "Sent out to other nodes on the mesh to allow them to compute a shared secret key",
                properties: {
                  value: state.publicKey,
                  showCopyButton: true,
                },
              },
            ],
          },
          {
            label: "Admin Settings",
            description: "Settings for Admin",
            fields: [
              {
                type: "passwordGenerator",
                name: "adminKey.0",
                id: "adminKey0Input",
                label: "Primary Admin Key",
                description:
                  "The primary public key authorized to send admin messages to this node",
                validationText: hasFieldError("adminKey0")
                  ? getErrorMessage("adminKey0")
                  : "",
                inputChange: (e) => adminKeyInputChangeEvent(e, 0),
                selectChange: () => {},
                bits: [{ text: "256 bit", value: "32", key: "bit256" }],
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
                label: "Secondary Admin Key",
                description:
                  "The secondary public key authorized to send admin messages to this node",
                validationText: hasFieldError("adminKey1")
                  ? getErrorMessage("adminKey1")
                  : "",
                inputChange: (e) => adminKeyInputChangeEvent(e, 1),
                selectChange: () => {},
                bits: [{ text: "256 bit", value: "32", key: "bit256" }],
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
                label: "Tertiary Admin Key",
                description:
                  "The tertiary public key authorized to send admin messages to this node",
                validationText: hasFieldError("adminKey2")
                  ? getErrorMessage("adminKey2")
                  : "",
                inputChange: (e) => adminKeyInputChangeEvent(e, 2),
                selectChange: () => {},
                bits: [{ text: "256 bit", value: "32", key: "bit256" }],
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
                label: "Managed",
                description:
                  "If true, device configuration options are only able to be changed remotely by a Remote Admin node via admin messages. Do not enable this option unless a suitable Remote Admin node has been setup, and the public key stored in the field below.",
              },
              {
                type: "toggle",
                name: "adminChannelEnabled",
                label: "Allow Legacy Admin",
                description:
                  "Allow incoming device control over the insecure legacy admin channel",
              },
            ],
          },
          {
            label: "Logging Settings",
            description: "Settings for Logging",
            fields: [
              {
                type: "toggle",
                name: "debugLogApiEnabled",
                label: "Enable Debug Log API",
                description:
                  "Output live debug logging over serial, view and export position-redacted device logs over Bluetooth",
              },
              {
                type: "toggle",
                name: "serialEnabled",
                label: "Serial Output Enabled",
                description: "Serial Console over the Stream API",
              },
            ],
          },
        ]}
      />
      <PkiRegenerateDialog
        text={{
          button: "Regenerate",
          title: "Regenerate Key pair?",
          description: "Are you sure you want to regenerate key pair?",
        }}
        open={state.privateKeyDialogOpen}
        onOpenChange={() =>
          dispatch({ type: "SHOW_PRIVATE_KEY_DIALOG", payload: false })}
        onSubmit={pkiRegenerate}
      />
    </>
  );
};
