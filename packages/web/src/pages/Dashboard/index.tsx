import LanguageSwitcher from "@components/LanguageSwitcher.tsx";
import { Button } from "@components/UI/Button.tsx";
import { Separator } from "@components/UI/Separator.tsx";
import { Heading } from "@components/UI/Typography/Heading.tsx";
import { Subtle } from "@components/UI/Typography/Subtle.tsx";
import { useAppStore, useDeviceStore, useNodeDBStore } from "@core/stores";
import { ListPlusIcon, PlusIcon, UsersIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export const Dashboard = () => {
  const { t } = useTranslation("dashboard");
  const { setConnectDialogOpen, setSelectedDevice } = useAppStore();
  const { getDevices } = useDeviceStore();
  const { getNodeDB } = useNodeDBStore();

  const devices = useMemo(() => getDevices(), [getDevices]);

  return (
    <div className="flex flex-col gap-3 p-3 px-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Heading as="h3">{t("dashboard.title")}</Heading>
          <Subtle>{t("dashboard.description")}</Subtle>
        </div>
        <LanguageSwitcher />
      </div>

      <Separator />

      <div className="flex h-[450px] rounded-md border border-dashed border-slate-200 p-3 dark:border-slate-700">
        {devices.length ? (
          <ul className="grow divide-y divide-slate-200">
            {devices.map((device) => {
              const nodeDB = getNodeDB(device.id);
              if (!nodeDB) {
                return;
              }

              return (
                <li key={device.id}>
                  <button
                    type="button"
                    className="w-full px-4 py-4 sm:px-6"
                    onClick={() => {
                      setSelectedDevice(device.id);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm font-medium text-accent">
                        {nodeDB.getNode(device.hardware.myNodeNum)?.user
                          ?.longName ?? t("unknown.shortName")}
                      </p>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="flex gap-2 text-sm text-slate-500">
                          <UsersIcon
                            size={20}
                            className="text-slate-400"
                            aria-hidden="true"
                          />
                          {nodeDB.getNodesLength() === 0
                            ? 0
                            : nodeDB.getNodesLength() - 1}
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="m-auto flex flex-col gap-3 text-center">
            <ListPlusIcon size={48} className="mx-auto text-text-secondary" />
            <Heading as="h3">{t("dashboard.noDevicesTitle")}</Heading>
            <Subtle>{t("dashboard.noDevicesDescription")}</Subtle>
            <Button
              className="gap-2"
              variant="default"
              onClick={() => setConnectDialogOpen(true)}
            >
              <PlusIcon size={16} />
              {t("dashboard.button_newConnection")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
