import type { SecurityValidation } from "@app/validation/config/security.js"
import { DynamicForm } from "@app/components/Form/DynamicForm.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { Protobuf } from "@meshtastic/js";
import { fromByteArray, toByteArray } from "base64-js";
import { useState } from "react";

export const Security = (): JSX.Element => {
  const { config, nodes, hardware, setWorkingConfig } = useDevice();

  const [adminKey, setAdminKey] = useState<string>(
    fromByteArray(config.security?.adminKey ?? new Uint8Array(0))
  );
  const [privateKey, setPrivateKey] = useState<string>(
    fromByteArray(config.security?.privateKey ?? new Uint8Array(0))
  );
  const [publicKey, setPublicKey] = useState<string>(
    fromByteArray(config.security?.publicKey ?? new Uint8Array(0))
  );

  const onSubmit = (data: SecurityValidation) => {
    setWorkingConfig(
      new Protobuf.Config.Config({
        payloadVariant: {
          case: "security",
          value: {
            ...data,
            adminKey: toByteArray(adminKey),
            privateKey: toByteArray(privateKey),
            publicKey: toByteArray(publicKey),
          }
        },
      })
    )
  };
  return (
    <DynamicForm<SecurityValidation>
      onSubmit={onSubmit}
      defaultValues={{
        ...config.security,
        adminKey: adminKey,
        privateKey: privateKey,
        publicKey: publicKey
      }}
      fieldGroups={[
        {
          label: "Security Settings",
          description: "Settings for the Security module",
          fields: [
            {
              type: "text",
              name: "publicKey",
              label: "Public Key",
              description: "Sent out to other nodes on the mesh to allow them to compute a shared secret key",
            },
            {
              type: "text",
              name: "privateKey",
              label: "Private Key",
              description: "Used to create a shared key with a remote device",
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
              label: "Admin Channel",
              description: "Enable 'admin' channel",
            },
            {
              type: "toggle",
              name: "isManaged",
              label: "Is Managed",
              description: "Enable if you want to manage this node from other nodes",
            },
            {
              type: "text",
              name: "adminKey",
              label: "Admin Key",
              description: "The public key authorized to send admin messages to this node",
            }
          ],
        },
        {
          label: "Logging Settings",
          description: "Settings for Logging",
          fields: [
            {
              type: "toggle",
              name: "bluetoothLoggingEnabled",
              label: "Bluetooth Logging",
              description: "Enable Bluetooth Logging",
            },
            {
              type: "toggle",
              name: "debugLogApiEnabled",
              label: "Debug Log API",
              description: "Enable Log API",
            },
            {
              type: "toggle",
              name: "serialEnabled",
              label: "Serial",
              description: "Enable Serial"
            }
          ],
        },
      ]}
      />
  )
};
