import { Heading } from "@components/UI/Typography/Heading.tsx";
import { useAppStore } from "@core/stores/appStore.ts";
import { useDeviceStore } from "@core/stores/deviceStore.ts";
import { Button } from "@components/UI/Button.tsx";
import { Separator } from "@components/UI/Seperator.tsx";
import { Subtle } from "@components/UI/Typography/Subtle.tsx";
import { NewConnectionDialog } from "@components/Dialog/NewConnectionDialog.tsx";
import { ConnectionTabs } from "@components/ConnectionTabs/ConnectionTabs.tsx";
import { PlusIcon, UsersIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@components/LanguageSwitcher.tsx";

export const Dashboard = () => {
  const { t } = useTranslation("dashboard");
  const { setSelectedDevice } = useAppStore();
  const { getDevices } = useDeviceStore();
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);

  const devices = useMemo(() => getDevices(), [getDevices]);

  // Show connection dialog only if user explicitly opens it
  // When no devices exist, we show inline connection tabs instead
  return (
    <>
      <NewConnectionDialog
        open={connectionDialogOpen}
        onOpenChange={setConnectionDialogOpen}
      />

      <div className="flex flex-col gap-3 p-3 px-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Heading as="h3">
              {t("dashboard.title")}
            </Heading>
            <Subtle>
              {t("dashboard.description")}
            </Subtle>
          </div>
          <LanguageSwitcher />
        </div>

        <Separator />

        {devices.length > 0
          ? (
            <div className="flex h-[450px] rounded-md border border-dashed border-slate-200 p-3 dark:border-slate-700">
              <ul className="grow divide-y divide-slate-200">
                {devices.map((device) => {
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
                            {device.getNode(device.hardware.myNodeNum)?.user
                              ?.longName ??
                              t("unknown.shortName")}
                          </p>
                          <div className="mt-2 sm:flex sm:justify-between">
                            <div className="flex gap-2 text-sm text-slate-500">
                              <UsersIcon
                                size={20}
                                className="text-slate-400"
                                aria-hidden="true"
                              />
                              {device.getNodesLength() === 0
                                ? 0
                                : device.getNodesLength() - 1}
                            </div>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="flex items-end">
                <Button
                  className="gap-2"
                  variant="outline"
                  onClick={() => setConnectionDialogOpen(true)}
                >
                  <PlusIcon size={16} />
                  {t("dashboard.button_newConnection")}
                </Button>
              </div>
            </div>
          )
          : (
            <div className="space-y-6">
              <div className="text-center">
                <Heading as="h3">
                  {t("dashboard.noDevicesTitle")}
                </Heading>
                <Subtle>
                  {t("dashboard.noDevicesDescription")}
                </Subtle>
              </div>
              <ConnectionTabs />
            </div>
          )}
      </div>
    </>
  );
};
