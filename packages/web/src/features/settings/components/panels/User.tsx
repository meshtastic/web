import type { UserValidation } from "../../validation/config/user";
import {
  ConfigFormFields,
  type FieldGroup,
} from "../form/ConfigFormFields";
import { useUserForm } from "../../hooks";
import { ConfigFormSkeleton } from "../../pages/SettingsLoading";
import { useRemoteAdminAuth } from "@shared/hooks";
import { useTranslation } from "react-i18next";

export const User = () => {
  const { t } = useTranslation("config");
  const { isAuthorized } = useRemoteAdminAuth();
  const { form, isReady, isDisabledByField } = useUserForm();

  if (!isReady) {
    return <ConfigFormSkeleton />;
  }

  const fieldGroups: FieldGroup<UserValidation>[] = [
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

  return (
    <ConfigFormFields
      form={form}
      fieldGroups={fieldGroups}
      isDisabledByField={isDisabledByField}
      disabled={!isAuthorized}
    />
  );
};
