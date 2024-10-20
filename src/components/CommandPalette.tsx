import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@components/UI/Command.tsx";
import { useAppStore } from "@core/stores/appStore.ts";
import { useDevice, useDeviceStore } from "@core/stores/deviceStore.ts";
import { Hashicon } from "@emeraldpay/hashicon-react";
import { useCommandState } from "cmdk";
import { useTranslation } from "react-i18next";
import {
  ArrowLeftRightIcon,
  BoxSelectIcon,
  BugIcon,
  EraserIcon,
  FactoryIcon,
  LayersIcon,
  LayoutIcon,
  LinkIcon,
  type LucideIcon,
  MapIcon,
  MessageSquareIcon,
  MoonIcon,
  PaletteIcon,
  PlusIcon,
  PowerIcon,
  QrCodeIcon,
  RefreshCwIcon,
  SettingsIcon,
  SmartphoneIcon,
  TrashIcon,
  UsersIcon,
  XCircleIcon,
} from "lucide-react";
import { useEffect } from "react";

export interface Group {
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
  icon: JSX.Element;
  action: () => void;
}

export const CommandPalette = (): JSX.Element => {
  const { t } = useTranslation();
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setSelectedDevice,
    removeDevice,
    selectedDevice,
    darkMode,
    setDarkMode,
    setAccent,
  } = useAppStore();
  const { getDevices } = useDeviceStore();
  const { setDialogOpen, setActivePage, connection } = useDevice();

  const groups: Group[] = [
    {
      label: t("Goto"),
      icon: LinkIcon,
      commands: [
        {
          label: t("Messages"),
          icon: MessageSquareIcon,
          action() {
            setActivePage("messages");
          },
        },
        {
          label: t("Map"),
          icon: MapIcon,
          action() {
            setActivePage("map");
          },
        },
        {
          label: t("Config"),
          icon: SettingsIcon,
          action() {
            setActivePage("config");
          },
          tags: ["settings"],
        },
        {
          label: t("Channels"),
          icon: LayersIcon,
          action() {
            setActivePage("channels");
          },
        },
        {
          label: t("Nodes"),
          icon: UsersIcon,
          action() {
            setActivePage("nodes");
          },
        },
      ],
    },
    {
      label: t("Manage"),
      icon: SmartphoneIcon,
      commands: [
        {
          label: t("Switch Node"),
          icon: ArrowLeftRightIcon,
          subItems: getDevices().map((device) => {
            return {
              label:
                device.nodes.get(device.hardware.myNodeNum)?.user?.longName ??
                device.hardware.myNodeNum.toString(),
              icon: (
                <Hashicon
                  size={16}
                  value={device.hardware.myNodeNum.toString()}
                />
              ),
              action() {
                setSelectedDevice(device.id);
              },
            };
          }),
        },
        {
          label: t("Connect New Node"),
          icon: PlusIcon,
          action() {
            setSelectedDevice(0);
          },
        },
      ],
    },
    {
      label: t("Contextual"),
      icon: BoxSelectIcon,
      commands: [
        {
          label: t("QR Code"),
          icon: QrCodeIcon,
          subItems: [
            {
              label: t("Generator"),
              icon: <QrCodeIcon size={16} />,
              action() {
                setDialogOpen("QR", true);
              },
            },
            {
              label: t("Import"),
              icon: <QrCodeIcon size={16} />,
              action() {
                setDialogOpen("import", true);
              },
            },
          ],
        },
        {
          label: t("Disconnect"),
          icon: XCircleIcon,
          action() {
            void connection?.disconnect();
            setSelectedDevice(0);
            removeDevice(selectedDevice ?? 0);
          },
        },
        {
          label: t("Schedule Shutdown"),
          icon: PowerIcon,
          action() {
            setDialogOpen("shutdown", true);
          },
        },
        {
          label: t("Schedule Reboot"),
          icon: RefreshCwIcon,
          action() {
            setDialogOpen("reboot", true);
          },
        },
        {
          label: t("Reset Nodes"),
          icon: TrashIcon,
          action() {
            connection?.resetNodes();
          },
        },
        {
          label: t("Factory Reset Device"),
          icon: FactoryIcon,
          action() {
            connection?.factoryResetDevice();
          },
        },
        {
          label: t("Factory Reset Config"),
          icon: FactoryIcon,
          action() {
            connection?.factoryResetConfig();
          },
        },
      ],
    },
    {
      label: t("Debug"),
      icon: BugIcon,
      commands: [
        {
          label: t("Reconfigure"),
          icon: RefreshCwIcon,
          action() {
            void connection?.configure();
          },
        },
        {
          label: t("[WIP] Clear Messages"),
          icon: EraserIcon,
          action() {
            alert(t("This feature is not implemented"));
          },
        },
      ],
    },
    {
      label: t("Application"),
      icon: LayoutIcon,
      commands: [
        {
          label: t("Toggle Dark Mode"),
          icon: MoonIcon,
          action() {
            setDarkMode(!darkMode);
          },
        },
        {
          label: t("Accent Color"),
          icon: PaletteIcon,
          subItems: [
            {
              label: t("Red"),
              icon: (
                <span
                  className={`h-3 w-3 rounded-full ${
                    darkMode ? "bg-[#f25555]" : "bg-[#f28585]"
                  }`}
                />
              ),
              action() {
                setAccent("red");
              },
            },
            {
              label: t("Orange"),
              icon: (
                <span
                  className={`h-3 w-3 rounded-full ${
                    darkMode ? "bg-[#e1720b]" : "bg-[#edb17a]"
                  }`}
                />
              ),
              action() {
                setAccent("orange");
              },
            },
            {
              label: t("Yellow"),
              icon: (
                <span
                  className={`h-3 w-3 rounded-full ${
                    darkMode ? "bg-[#ac8c1a]" : "bg-[#e0cc87]"
                  }`}
                />
              ),
              action() {
                setAccent("yellow");
              },
            },
            {
              label: t("Green"),
              icon: (
                <span
                  className={`h-3 w-3 rounded-full ${
                    darkMode ? "bg-[#27a341]" : "bg-[#8bc9c5]"
                  }`}
                />
              ),
              action() {
                setAccent("green");
              },
            },
            {
              label: t("Blue"),
              icon: (
                <span
                  className={`h-3 w-3 rounded-full ${
                    darkMode ? "bg-[#2093fe]" : "bg-[#70afea]"
                  }`}
                />
              ),
              action() {
                setAccent("blue");
              },
            },
            {
              label: t("Purple"),
              icon: (
                <span
                  className={`h-3 w-3 rounded-full ${
                    darkMode ? "bg-[#926bff]" : "bg-[#a09eef]"
                  }`}
                />
              ),
              action() {
                setAccent("purple");
              },
            },
            {
              label: t("Pink"),
              icon: (
                <span
                  className={`h-3 w-3 rounded-full ${
                    darkMode ? "bg-[#e454c4]" : "bg-[#dba0c7]"
                  }`}
                />
              ),
              action() {
                setAccent("pink");
              },
            },
          ],
        },
      ],
    },
  ];

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [setCommandPaletteOpen]);

  return (
    <CommandDialog
      open={commandPaletteOpen}
      onOpenChange={setCommandPaletteOpen}
    >
      <CommandInput placeholder={t("Type a command or search...")} />
      <CommandList>
        <CommandEmpty>{t("No results found.")}</CommandEmpty>
        {groups.map((group) => (
          <CommandGroup key={group.label} heading={group.label}>
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
  if (!search) return null;

  return (
    <CommandItem onSelect={action}>
      {icon}
      {label}
    </CommandItem>
  );
};
