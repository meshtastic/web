import { DynamicForm } from "@app/components/Form/DynamicForm.js";
import {
  getX25519PrivateKey,
  getX25519PublicKey,
} from "@app/core/utils/x25519";
import type { SecurityValidation } from "@app/validation/config/security.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { Protobuf } from "@meshtastic/js";
import { fromByteArray, toByteArray } from "base64-js";
import cryptoRandomString from "crypto-random-string";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export const Security = (): JSX.Element => {
  const { config, nodes, hardware, setWorkingConfig } = useDevice();

  const [privateKey, setPrivateKey] = useState<string>(
    fromByteArray(config.security?.privateKey ?? new Uint8Array(0)),
  );
  const [privateKeyVisible, setPrivateKeyVisible] = useState<boolean>(false);
  const [privateKeyBitCount, setPrivateKeyBitCount] = useState<number>(
    config.security?.privateKey.length ?? 32,
  );
  const [privateKeyValidationText, setPrivateKeyValidationText] =
    useState<string>();
  const [publicKey, setPublicKey] = useState<string>(
    fromByteArray(config.security?.publicKey ?? new Uint8Array(0)),
  );
  const [adminKey, setAdminKey] = useState<string>(
    fromByteArray(config.security?.adminKey ?? new Uint8Array(0)),
  );
  const [adminKeyVisible, setAdminKeyVisible] = useState<boolean>(false);
  const [adminKeyBitCount, setAdminKeyBitCount] = useState<number>(
    config.security?.adminKey.length ?? 16,
  );
  const [adminKeyValidationText, setAdminKeyValidationText] =
    useState<string>();

  const onSubmit = (data: SecurityValidation) => {
    if (privateKeyValidationText || adminKeyValidationText) return;

    setWorkingConfig(
      new Protobuf.Config.Config({
        payloadVariant: {
          case: "security",
          value: {
            ...data,
            adminKey: toByteArray(adminKey),
            privateKey: toByteArray(privateKey),
            publicKey: toByteArray(publicKey),
          },
        },
      }),
    );
  };

  const privateKeyClickEvent = () => {
    const privateKey = getX25519PrivateKey();
    const publicKey = getX25519PublicKey(privateKey);

    setPrivateKey(fromByteArray(privateKey));
    setPublicKey(fromByteArray(publicKey));
    validatePass(
      fromByteArray(privateKey),
      privateKeyBitCount,
      setPrivateKeyValidationText,
    );
  };

  const adminKeyClickEvent = () => {
    setAdminKey(
      btoa(
        cryptoRandomString({
          length: adminKeyBitCount ?? 0,
          type: "alphanumeric",
        }),
      ),
    );
    setAdminKeyValidationText(undefined);
  };

  const validatePass = (
    input: string,
    count: number,
    setValidationText: (
      value: React.SetStateAction<string | undefined>,
    ) => void,
  ) => {
    try {
      if (input.length % 4 !== 0 || toByteArray(input).length !== count) {
        setValidationText(`Please enter a valid ${count * 8} bit PSK.`);
      } else {
        setValidationText(undefined);
      }
    } catch (e) {
      console.error(e);
      setValidationText(`Please enter a valid ${count * 8} bit PSK.`);
    }
  };

  const privateKeyInputChangeEvent = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const privateKeyB64String = e.currentTarget?.value;
    setPrivateKey(privateKeyB64String);
    validatePass(
      privateKeyB64String,
      privateKeyBitCount,
      setPrivateKeyValidationText,
    );

    const publicKey = getX25519PublicKey(toByteArray(privateKeyB64String));
    setPublicKey(fromByteArray(publicKey));
  };

  const adminKeyInputChangeEvent = (e: React.ChangeEvent<HTMLInputElement>) => {
    const psk = e.currentTarget?.value;
    setAdminKey(psk);
    validatePass(psk, privateKeyBitCount, setAdminKeyValidationText);
  };

  const privateKeySelectChangeEvent = (e: string) => {
    const count = Number.parseInt(e);
    setPrivateKeyBitCount(count);
    validatePass(privateKey, count, setPrivateKeyValidationText);
  };

  const adminKeySelectChangeEvent = (e: string) => {
    const count = Number.parseInt(e);
    setAdminKeyBitCount(count);
    validatePass(privateKey, count, setAdminKeyValidationText);
  };

  return (
    <DynamicForm<SecurityValidation>
      onSubmit={onSubmit}
      defaultValues={{
        ...config.security,
        ...{
          adminKey: adminKey,
          privateKey: privateKey,
          publicKey: publicKey,
        },
      }}
      fieldGroups={[
        {
          label: "Security Settings",
          description: "Settings for the Security configuration",
          fields: [
            {
              type: "passwordGenerator",
              name: "privateKey",
              label: "Private Key",
              description: "Used to create a shared key with a remote device",
              bits: [{ text: "256 bit", value: "32", key: "bit256" }],
              validationText: privateKeyValidationText,
              devicePSKBitCount: privateKeyBitCount,
              inputChange: privateKeyInputChangeEvent,
              selectChange: privateKeySelectChangeEvent,
              hide: !privateKeyVisible,
              buttonClick: privateKeyClickEvent,
              disabledBy: [
                {
                  fieldName: "adminChannelEnabled",
                  invert: true,
                },
              ],
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
              label: "Public Key",
              description:
                "Sent out to other nodes on the mesh to allow them to compute a shared secret key",
              disabledBy: [{ fieldName: "always" }],
              properties: {
                value: publicKey,
              },
            },
          ],
        },
        {
          label: "Admin Settings",
          description: "Settings for Admin ",
          fields: [
            {
              type: "toggle",
              name: "adminChannelEnabled",
              label: "Allow Legacy Admin",
              description:
                "Allow incoming device control over the insecure legacy admin channel",
            },
            {
              type: "toggle",
              name: "isManaged",
              label: "Managed",
              description:
                'If true, device is considered to be "managed" by a mesh administrator via admin messages',
            },
            {
              type: "passwordGenerator",
              name: "adminKey",
              label: "Admin Key",
              description:
                "The public key authorized to send admin messages to this node",
              validationText: adminKeyValidationText,
              devicePSKBitCount: adminKeyBitCount,
              inputChange: adminKeyInputChangeEvent,
              selectChange: adminKeySelectChangeEvent,
              hide: !adminKeyVisible,
              buttonClick: adminKeyClickEvent,
              disabledBy: [{ fieldName: "adminChannelEnabled" }],
              properties: {
                value: adminKey,
                action: {
                  icon: adminKeyVisible ? EyeOff : Eye,
                  onClick: () => setAdminKeyVisible(!adminKeyVisible),
                },
              },
            },
          ],
        },
        {
          label: "Logging Settings",
          description: "Settings for Logging",
          fields: [
            {
              type: "toggle",
              name: "bluetoothLoggingEnabled",
              label: "Allow Bluetooth Logging",
              description: "Enables device (serial style logs) over Bluetooth",
            },
            {
              type: "toggle",
              name: "debugLogApiEnabled",
              label: "Enable Debug Log API",
              description: "Output live debug logging over serial",
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
  );
};
