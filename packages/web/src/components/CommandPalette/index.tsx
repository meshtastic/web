import { Avatar } from "@components/UI/Avatar.tsx";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@components/UI/Command.tsx";
import { usePinnedItems } from "@core/hooks/usePinnedItems.ts";
import {
  useAppStore,
  useDevice,
  useDeviceStore,
  useNodeDB,
} from "@core/stores";
import { cn } from "@core/utils/cn.ts";
import { useNavigate } from "@tanstack/react-router";
import { useCommandState } from "cmdk";
import {
  ArrowLeftRightIcon,
  BoxSelectIcon,
  BugIcon,
  CloudOff,
  EraserIcon,
  FactoryIcon,
  HardDriveUpload,
  LinkIcon,
  type LucideIcon,
  MapIcon,
  MessageSquareIcon,
  Pin,
  PlusIcon,
  PowerIcon,
  QrCodeIcon,
  RefreshCwIcon,
  SettingsIcon,
  SmartphoneIcon,
  TrashIcon,
  UsersIcon,
} from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export interface Group {
  id: string;
  label: string;
  icon: LucideIcon;
  commands: Command[];
}
export interface Command {
  label: string;
  icon: LucideIcon;
  action?: () => void;
  subItems?: SubItem[];
  tags?: string[];
}
export interface SubItem {
  label: string;
  icon: React.ReactNode;
  action: () => void;
}

export const CommandPalette = () => {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setConnectDialogOpen,
    setSelectedDevice,
  } = useAppStore();
  const { getDevices } = useDeviceStore();
  const { setDialogOpen, connection } = useDevice();
  const { getNode } = useNodeDB();
  const { pinnedItems, togglePinnedItem } = usePinnedItems({
    storageName: "pinnedCommandMenuGroups",
  });
  const { t } = useTranslation("commandPalette");
  const navigate = useNavigate({ from: "/" });

  const groups: Group[] = [
    {
      id: "gotoGroup",
      label: t("goto.label"),
      icon: LinkIcon,
      commands: [
        {
          label: t("goto.command.messages"),
          icon: MessageSquareIcon,
          action() {
            navigate({ to: "/messages" });
          },
        },
        {
          label: t("goto.command.map"),
          icon: MapIcon,
          action() {
            navigate({ to: "/map" });
          },
        },
        {
          label: t("goto.command.config"),
          icon: SettingsIcon,
          action() {
            navigate({ to: "/config" });
          },
          tags: ["settings"],
        },
        {
          label: t("goto.command.nodes"),
          icon: UsersIcon,
          action() {
            navigate({ to: "/nodes" });
          },
        },
      ],
    },
    {
      id: "manageGroup",
      label: t("manage.label"),
      icon: SmartphoneIcon,
      commands: [
        {
          label: t("manage.command.switchNode"),
          icon: ArrowLeftRightIcon,
          subItems: getDevices().map((device) => ({
            label:
              getNode(device.hardware.myNodeNum)?.user?.longName ??
              t("unknown.shortName"),
            icon: (
              <Avatar
                text={
                  getNode(device.hardware.myNodeNum)?.user?.shortName ??
                  t("unknown.shortName")
                }
              />
            ),
            action() {
              setSelectedDevice(device.id);
            },
          })),
        },
        {
          label: t("manage.command.connectNewNode"),
          icon: PlusIcon,
          action() {
            setConnectDialogOpen(true);
          },
        },
      ],
    },
    {
      id: "contextualGroup",
      label: t("contextual.label"),
      icon: BoxSelectIcon,
      commands: [
        {
          label: t("contextual.command.qrCode"),
          icon: QrCodeIcon,
          subItems: [
            {
              label: t("contextual.command.qrGenerator"),
              icon: <QrCodeIcon size={16} />,
              action() {
                setDialogOpen("QR", true);
              },
            },
            {
              label: t("contextual.command.qrImport"),
              icon: <QrCodeIcon size={16} />,
              action() {
                setDialogOpen("import", true);
              },
            },
          ],
        },
        {
          label: t("contextual.command.scheduleShutdown"),
          icon: PowerIcon,
          action() {
            setDialogOpen("shutdown", true);
          },
        },
        {
          label: t("contextual.command.scheduleReboot"),
          icon: RefreshCwIcon,
          action() {
            setDialogOpen("reboot", true);
          },
        },
        {
          label: t("contextual.command.dfuMode"),
          icon: HardDriveUpload,
          action() {
            connection?.enterDfuMode();
          },
        },
        {
          label: t("contextual.command.resetNodeDb"),
          icon: TrashIcon,
          action() {
            setDialogOpen("resetNodeDb", true);
          },
        },
        {
          label: t("contextual.command.disconnect"),
          icon: CloudOff,
          action() {
            connection?.disconnect().catch((error) => {
              console.error("Failed to disconnect:", error);
            });
          },
        },
        {
          label: t("contextual.command.factoryResetDevice"),
          icon: FactoryIcon,
          action() {
            setDialogOpen("factoryResetDevice", true);
          },
        },
        {
          label: t("contextual.command.factoryResetConfig"),
          icon: FactoryIcon,
          action() {
            setDialogOpen("factoryResetConfig", true);
          },
        },
      ],
    },
    {
      id: "debugGroup",
      label: t("debug.label"),
      icon: BugIcon,
      commands: [
        {
          label: t("debug.command.reconfigure"),
          icon: RefreshCwIcon,
          action() {
            void connection?.configure();
          },
        },
        {
          label: t("debug.command.clearAllStoredMessages"),
          icon: EraserIcon,
          action() {
            setDialogOpen("deleteMessages", true);
          },
        },
        {
          label: t("debug.command.clearAllStores"),
          icon: EraserIcon,
          action() {
            setDialogOpen("clearAllStores", true);
          },
        },
      ],
    },
  ];

  const sortedGroups = [...groups].sort((a, b) => {
    const aPinned = pinnedItems.includes(a.id) ? 1 : 0;
    const bPinned = pinnedItems.includes(b.id) ? 1 : 0;
    return bPinned - aPinned;
  });

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    globalThis.addEventListener("keydown", handleKeydown);
    return () => globalThis.removeEventListener("keydown", handleKeydown);
  }, [setCommandPaletteOpen]);

  return (
    <CommandDialog
      open={commandPaletteOpen}
      onOpenChange={setCommandPaletteOpen}
    >
      <CommandInput placeholder={t("search.commandPalette")} />
      <CommandList>
        <CommandEmpty>{t("emptyState")}</CommandEmpty>
        {sortedGroups.map((group) => (
          <CommandGroup
            key={group.label}
            heading={
              <div className="flex items-center justify-between">
                <span>{group.label}</span>
                <button
                  type="button"
                  onClick={() => togglePinnedItem(group.id)}
                  className={cn(
                    "transition-all duration-300 scale-100 cursor-pointer p-2 focus:*:data-label:opacity-100",
                  )}
                >
                  <span
                    data-label
                    className="transition-all block absolute w-full mb-auto mt-auto ml-0 mr-0 text-xs left-0 -top-5 opacity-0 rounded-lg"
                  />
                  <Pin
                    size={16}
                    className={cn(
                      "transition-opacity",
                      pinnedItems.includes(group.id)
                        ? "opacity-100 text-red-500"
                        : "opacity-40 hover:opacity-70",
                    )}
                  />
                </button>
              </div>
            }
          >
            {group.commands.map((command) => (
              <div key={command.label}>
                <CommandItem
                  onSelect={() => {
                    command.action?.();
                    setCommandPaletteOpen(false);
                  }}
                >
                  <command.icon size={16} className="mr-2" />
                  {command.label}
                </CommandItem>
                {command.subItems?.map((subItem) => (
                  <SubItem
                    key={subItem.label}
                    label={subItem.label}
                    icon={subItem.icon}
                    action={subItem.action}
                  />
                ))}
              </div>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
};

const SubItem = ({
  label,
  icon,
  action,
}: {
  label: string;
  icon: React.ReactNode;
  action: () => void;
}) => {
  const search = useCommandState((state) => state.search);
  if (!search) {
    return null;
  }

  return (
    <CommandItem onSelect={action}>
      {icon}
      {label}
    </CommandItem>
  );
};
