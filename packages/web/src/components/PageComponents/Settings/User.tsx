import {
  type UserValidation,
  UserValidationSchema,
} from "@app/validation/config/user.ts";
import { create } from "@bufbuild/protobuf";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import {
  createFieldMetadata,
  useFieldRegistry,
} from "@core/services/fieldRegistry";
import { useNodes } from "@db/hooks";
import { useDevice, useDeviceContext } from "@core/stores";
import { Protobuf } from "@meshtastic/core";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

interface UserConfigProps {
  onFormInit: DynamicFormFormInit<UserValidation>;
}

export const User = ({ onFormInit }: UserConfigProps) => {
  const { hardware, connection } = useDevice();
  const { deviceId } = useDeviceContext();
  const { nodes: allNodes } = useNodes(deviceId);
  const {
    registerFields,
    trackChange,
    removeChange: removeFieldChange,
  } = useFieldRegistry();
  const { t } = useTranslation("config");

  const section = { type: "config", variant: "user" } as const;

  const myNode = allNodes.find((n) => n.nodeNum === hardware.myNodeNum);
  const defaultUser = {
    id: myNode?.userId ?? "",
    longName: myNode?.longName ?? "",
    shortName: myNode?.shortName ?? "",
    isLicensed: myNode?.isLicensed ?? false,
  };

  const fieldGroups = [
        {
          label: t("user.title"),
          description: t("user.description"),
          fields: [
            {
              type: "text",
              name: "longName",
              label: t("user.longName.label"),
              description: t("user.longName.description"),
              properties: {
                fieldLength: {
                  min: 1,
                  max: 40,
                  showCharacterCount: true,
                },
              },
            },
            {
              type: "text",
              name: "shortName",
              label: t("user.shortName.label"),
              description: t("user.shortName.description"),
              properties: {
                fieldLength: {
                  min: 2,
                  max: 4,
                  showCharacterCount: true,
                },
              },
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
      ];

  // Register fields on mount
  useEffect(() => {
    const metadata = createFieldMetadata(section, fieldGroups);
    registerFields(section, metadata);
  }, [registerFields, fieldGroups, section]);

  const onSubmit = (data: UserValidation) => {
    const userData = create(Protobuf.Mesh.UserSchema, {
      ...data,
    });

    // Track individual field changes
    (Object.keys(data) as Array<keyof UserValidation>).forEach((fieldName) => {
      const newValue = data[fieldName];
      const oldValue = defaultUser[fieldName as keyof typeof defaultUser];

      if (newValue !== oldValue) {
        trackChange(section, fieldName as string, newValue, oldValue);
      } else {
        removeFieldChange(section, fieldName as string);
      }
    });

    // Send to device
    connection?.setOwner(userData);
  };

  return (
    <DynamicForm<UserValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={UserValidationSchema}
      defaultValues={{
        longName: defaultUser.longName,
        shortName: defaultUser.shortName,
        isLicensed: defaultUser.isLicensed,
        isUnmessageable: false,
      }}
      values={{
        longName: defaultUser.longName,
        shortName: defaultUser.shortName,
        isLicensed: defaultUser.isLicensed,
        isUnmessageable: false,
      }}
      fieldGroups={fieldGroups}
    />
  );
};
