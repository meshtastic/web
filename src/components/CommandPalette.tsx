import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@components/UI/Command.js";
import { useAppStore } from "@core/stores/appStore.js";
import { useDevice, useDeviceStore } from "@core/stores/deviceStore.js";
import { Hashicon } from "@emeraldpay/hashicon-react";
import { useCommandState } from "cmdk";
import {
  ArrowLeftRightIcon,
  BoxSelectIcon,
  BugIcon,
  EraserIcon,
  FactoryIcon,
  LayersIcon,
  LayoutIcon,
  LinkIcon,
  LucideIcon,
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
      label: "Goto",
      icon: LinkIcon,
      commands: [
        {
          label: "Messages",
          icon: MessageSquareIcon,
          action() {
            setActivePage("messages");
          },
        },
        {
          label: "Map",
          icon: MapIcon,
          action() {
            setActivePage("map");
          },
        },
        {
          label: "Config",
          icon: SettingsIcon,
          action() {
            setActivePage("config");
          },
          tags: ["settings"],
        },
        {
          label: "Channels",
          icon: LayersIcon,
          action() {
            setActivePage("channels");
          },
        },
        {
          label: "Peers",
          icon: UsersIcon,
          action() {
            setActivePage("peers");
          },
        },
      ],
    },
    {
      label: "Manage",
      icon: SmartphoneIcon,
      commands: [
        {
          label: "Switch Node",
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
          label: "Connect New Node",
          icon: PlusIcon,
          action() {
            setSelectedDevice(0);
          },
        },
      ],
    },
    {
      label: "Contextual",
      icon: BoxSelectIcon,
      commands: [
        {
          label: "QR Code",
          icon: QrCodeIcon,
          subItems: [
            {
              label: "Generator",
              icon: <QrCodeIcon size={16} />,
              action() {
                setDialogOpen("QR", true);
              },
            },
            {
              label: "Import",
              icon: <QrCodeIcon size={16} />,
              action() {
                setDialogOpen("import", true);
              },
            },
          ],
        },
        {
          label: "Disconnect",
          icon: XCircleIcon,
          action() {
            void connection?.disconnect();
            setSelectedDevice(0);
            removeDevice(selectedDevice ?? 0);
          },
        },
        {
          label: "Schedule Shutdown",
          icon: PowerIcon,
          action() {
            setDialogOpen("shutdown", true);
          },
        },
        {
          label: "Schedule Reboot",
          icon: RefreshCwIcon,
          action() {
            setDialogOpen("reboot", true);
          },
        },
        {
          label: "Reset Peers",
          icon: TrashIcon,
          action() {
            connection?.resetPeers();
          },
        },
        {
          label: "Factory Reset",
          icon: FactoryIcon,
          action() {
            connection?.factoryReset();
          },
        },
      ],
    },
    {
      label: "Debug",
      icon: BugIcon,
      commands: [
        {
          label: "Reconfigure",
          icon: RefreshCwIcon,
          action() {
            void connection?.configure();
          },
        },
        {
          label: "[WIP] Clear Messages",
          icon: EraserIcon,
          action() {
            alert("This feature is not implemented");
          },
        },
      ],
    },
    {
      label: "Application",
      icon: LayoutIcon,
      commands: [
        {
          label: "Toggle Dark Mode",
          icon: MoonIcon,
          action() {
            setDarkMode(!darkMode);
          },
        },
        {
          label: "Accent Color",
          icon: PaletteIcon,
          subItems: [
            {
              label: "Red",
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
              label: "Orange",
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
              label: "Yellow",
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
              label: "Green",
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
              label: "Blue",
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
              label: "Purple",
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
              label: "Pink",
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
  }, []);

  return (
    <CommandDialog
      open={commandPaletteOpen}
      onOpenChange={setCommandPaletteOpen}
    >
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
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
