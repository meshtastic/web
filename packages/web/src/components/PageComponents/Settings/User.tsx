import {
  type UserValidation,
  UserValidationSchema,
} from "@app/validation/config/user.ts";
import { create } from "@bufbuild/protobuf";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { useDevice, useNodeDB } from "@core/stores";
import { Protobuf } from "@meshtastic/core";
import { useTranslation } from "react-i18next";

interface UserConfigProps {
  onFormInit: DynamicFormFormInit<UserValidation>;
}

export const User = ({ onFormInit }: UserConfigProps) => {
  const { hardware, getChange, connection } = useDevice();
  const { getNode } = useNodeDB();
  const { t } = useTranslation("config");

  const myNode = getNode(hardware.myNodeNum);
  const defaultUser = myNode?.user ?? {
    id: "",
    longName: "",
    shortName: "",
    isLicensed: false,
  };

  // Get working copy from change registry
  const workingUser = getChange({ type: "user" }) as
    | Protobuf.Mesh.User
    | undefined;

  const effectiveUser = workingUser ?? defaultUser;

  const onSubmit = (data: UserValidation) => {
    connection?.setOwner(
      create(Protobuf.Mesh.UserSchema, {
        ...data,
      }),
    );
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
        longName: effectiveUser.longName,
        shortName: effectiveUser.shortName,
        isLicensed: effectiveUser.isLicensed,
        isUnmessageable: false,
      }}
      fieldGroups={[
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
      ]}
    />
  );
};
