import { PkiRegenerateDialog } from "@app/components/Dialog/PkiRegenerateDialog";
import { DynamicForm } from "@app/components/Form/DynamicForm.tsx";
import {
  getX25519PrivateKey,
  getX25519PublicKey,
} from "@app/core/utils/x25519";
import type { SecurityValidation } from "@app/validation/config/security.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf } from "@meshtastic/js";
import { useTranslation } from "react-i18next";
import { fromByteArray, toByteArray } from "base64-js";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export const Security = (): JSX.Element => {
  const { config, nodes, hardware, setWorkingConfig } = useDevice();
  const { t } = useTranslation();

  const [privateKey, setPrivateKey] = useState<string>(
    fromByteArray(config.security?.privateKey ?? new Uint8Array(0))
  );
  const [privateKeyVisible, setPrivateKeyVisible] = useState<boolean>(false);
  const [privateKeyBitCount, setPrivateKeyBitCount] = useState<number>(
    config.security?.privateKey.length ?? 32
  );
  const [privateKeyValidationText, setPrivateKeyValidationText] =
    useState<string>();
  const [publicKey, setPublicKey] = useState<string>(
    fromByteArray(config.security?.publicKey ?? new Uint8Array(0))
  );
  const [adminKey, setAdminKey] = useState<string>(
    fromByteArray(config.security?.adminKey[0] ?? new Uint8Array(0))
  );
  const [adminKeyValidationText, setAdminKeyValidationText] =
    useState<string>();
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  const onSubmit = (data: SecurityValidation) => {
    if (privateKeyValidationText || adminKeyValidationText) return;

    setWorkingConfig(
      new Protobuf.Config.Config({
        payloadVariant: {
          case: "security",
          value: {
            ...data,
            adminKey: [toByteArray(adminKey)],
            privateKey: toByteArray(privateKey),
            publicKey: toByteArray(publicKey),
          },
        },
      })
    );
  };

  const validateKey = (
    input: string,
    count: number,
    setValidationText: (value: React.SetStateAction<string | undefined>) => void
  ) => {
    try {
      if (input.length % 4 !== 0 || toByteArray(input).length !== count) {
        setValidationText(
          t("Please enter a valid bit PSK.", { count: count * 8 })
        );
      } else {
        setValidationText(undefined);
      }
    } catch (e) {
      console.error(e);
      setValidationText(
        t("Please enter a valid bit PSK.", { count: count * 8 })
      );
    }
  };

  const privateKeyClickEvent = () => {
    setDialogOpen(true);
  };

  const pkiRegenerate = () => {
    const privateKey = getX25519PrivateKey();
    const publicKey = getX25519PublicKey(privateKey);

    setPrivateKey(fromByteArray(privateKey));
    setPublicKey(fromByteArray(publicKey));
    validateKey(
      fromByteArray(privateKey),
      privateKeyBitCount,
      setPrivateKeyValidationText
    );

    setDialogOpen(false);
  };

  const privateKeyInputChangeEvent = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const privateKeyB64String = e.target.value;
    setPrivateKey(privateKeyB64String);
    validateKey(
      privateKeyB64String,
      privateKeyBitCount,
      setPrivateKeyValidationText
    );

    const publicKey = getX25519PublicKey(toByteArray(privateKeyB64String));
    setPublicKey(fromByteArray(publicKey));
  };

  const adminKeyInputChangeEvent = (e: React.ChangeEvent<HTMLInputElement>) => {
    const psk = e.currentTarget?.value;
    setAdminKey(psk);
    validateKey(psk, privateKeyBitCount, setAdminKeyValidationText);
  };

  const privateKeySelectChangeEvent = (e: string) => {
    const count = Number.parseInt(e);
    setPrivateKeyBitCount(count);
    validateKey(privateKey, count, setPrivateKeyValidationText);
  };

  return (
    <>
      <DynamicForm<SecurityValidation>
        onSubmit={onSubmit}
        submitType="onChange"
        defaultValues={{
          ...config.security,
          ...{
            adminKey: adminKey,
            privateKey: privateKey,
            publicKey: publicKey,
            adminChannelEnabled: config.security?.adminChannelEnabled ?? false,
            isManaged: config.security?.isManaged ?? false,
            debugLogApiEnabled: config.security?.debugLogApiEnabled ?? false,
            serialEnabled: config.security?.serialEnabled ?? false,
          },
        }}
        fieldGroups={[
          {
            label: t("Security Settings"),
            description: "Settings for the Security configuration",
            fields: [
              {
                type: "passwordGenerator",
                name: "privateKey",
                label: t("Private Key"),
                description: t(
                  "Used to create a shared key with a remote device"
                ),
                bits: [{ text: "256 bit", value: "32", key: "bit256" }],
                validationText: privateKeyValidationText,
                devicePSKBitCount: privateKeyBitCount,
                inputChange: privateKeyInputChangeEvent,
                selectChange: privateKeySelectChangeEvent,
                hide: !privateKeyVisible,
                buttonClick: privateKeyClickEvent,
                properties: {
                  value: privateKey,
                  action: {
                    icon: privateKeyVisible ? EyeOff : Eye,
                    onClick: () => setPrivateKeyVisible(!privateKeyVisible),
                  },
                },
              },
              {
                type: "text",
                name: "publicKey",
                label: t("Public Key"),
                disabled: true,
                description: t(
                  "Sent out to other nodes on the mesh to allow them to compute a shared secret key"
                ),
                properties: {
                  value: publicKey,
                },
              },
            ],
          },
          {
            label: t("Admin Settings"),
            description: t("Settings for Admin"),
            fields: [
              {
                type: "toggle",
                name: "adminChannelEnabled",
                label: t("Allow Legacy Admin"),
                description: t(
                  "Allow incoming device control over the insecure legacy admin channel"
                ),
              },
              {
                type: "toggle",
                name: "isManaged",
               label: t("Managed"),
                description: t(
                  'If true, device is considered to be "managed" by a mesh administrator via admin messages'
                ),
              },
              {
                type: "text",
                name: "adminKey",
                label: t("Admin Key"),
                description: t(
                  "The public key authorized to send admin messages to this node"
                ),
                validationText: adminKeyValidationText,
                inputChange: adminKeyInputChangeEvent,
                disabledBy: [
                  { fieldName: "adminChannelEnabled", invert: true },
                ],
                properties: {
                  value: adminKey,
                },
              },
            ],
          },
          {
            label: t("Logging Settings"),
            description: t("Settings for Logging"),
            fields: [
              {
                type: "toggle",
                name: "debugLogApiEnabled",
                label: t("Enable Debug Log API"),
                description: t(
                  "Output live debug logging over serial, view and export position-redacted device logs over Bluetooth"
                ),
              },
              {
                type: "toggle",
                name: "serialEnabled",
                label: t("Serial Output Enabled"),
                description: t("Serial Console over the Stream API"),
              },
            ],
          },
        ]}
      />
      <PkiRegenerateDialog
        open={dialogOpen}
        onOpenChange={() => setDialogOpen(false)}
        onSubmit={() => pkiRegenerate()}
      />
    </>
  );
};
