import { DynamicForm } from "@app/components/Form/DynamicForm";

export const Security = (): JSX.Element => {
  const onSubmit = (data: any) => {
    console.log(data);
  };
  return (
    <DynamicForm
      onSubmit={onSubmit}
      fieldGroups={[
        {
          label: "Security",
          description: "Admin and direct messages keys",
          fields: [
            {
              type: "text",
              name: "publicKey",
              label: "Public Key",
              description: "Sent out to other nodes on the mesh to allow them to compute a shared secret key.",
            },
            {
              type: "text",
              name: "privateKey",
              label: "Private Key",
              description: "Used to create a shared key with a remote device."
            },
            {
              type: "text",
              name: "adminKey",
              label: "Admin Key",
              description: "The public key authorized to send admin messages to this node."
            }
          ],
        },
      ]}
      />
  )
};