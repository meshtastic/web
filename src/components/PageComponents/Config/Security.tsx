import { DynamicForm } from "@app/components/Form/DynamicForm.js";

export const Security = (): JSX.Element => {
  const onSubmit = (data: any) => {
    console.log(data);
  };
  return (
    <DynamicForm
      onSubmit={onSubmit}
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