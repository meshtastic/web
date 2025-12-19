import { BackupRestore } from "@components/PageComponents/Settings/BackupRestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@components/ui/card";
import { useTranslation } from "react-i18next";

interface BackupRestoreConfigProps {
  searchQuery?: string;
}

export const BackupRestoreConfig = ({
  searchQuery = "",
}: BackupRestoreConfigProps) => {
  const { t } = useTranslation("config");

  const query = searchQuery.toLowerCase().trim();
  const isVisible =
    !query ||
    "backup restore import export config keys yaml".includes(query) ||
    t("settings.advanced.backupRestore.title", "Backup & Restore")
      .toLowerCase()
      .includes(query);

  if (!isVisible) {
    return (
      <Card className="max-w-7xl">
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            No settings found matching "{searchQuery}"
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="max-w-7xl">
        <CardHeader>
          <CardTitle>
            {t("settings.advanced.backupRestore.title", "Backup & Restore")}
          </CardTitle>
          <CardDescription>
            {t(
              "settings.advanced.backupRestore.description",
              "Export and import device configuration and encryption keys",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BackupRestore />
        </CardContent>
      </Card>
    </div>
  );
};
