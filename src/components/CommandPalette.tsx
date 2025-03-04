import { Avatar } from "./UI/Avatar.tsx";
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
import { useCommandState } from "cmdk";
import {
  ArrowLeftRightIcon,
  BoxSelectIcon,
  BugIcon,
  EraserIcon,
  FactoryIcon,
  LayersIcon,
  LinkIcon,
  type LucideIcon,
  MapIcon,
  MessageSquareIcon,
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
  icon: React.ReactNode;
  action: () => void;
}

export const CommandPalette = () => {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setSelectedDevice,
    removeDevice,
    selectedDevice,
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
          label: "Nodes",
          icon: UsersIcon,
          action() {
            setActivePage("nodes");
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
                <Avatar
                  text={device.nodes.get(device.hardware.myNodeNum)?.user
                    ?.shortName ?? device.hardware.myNodeNum.toString()}
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
          label: "Reset Nodes",
          icon: TrashIcon,
          action() {
            connection?.resetNodes();
          },
        },
        {
          label: "Factory Reset Device",
          icon: FactoryIcon,
          action() {
            connection?.factoryResetDevice();
          },
        },
        {
          label: "Factory Reset Config",
          icon: FactoryIcon,
          action() {
            connection?.factoryResetConfig();
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
  ];

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
