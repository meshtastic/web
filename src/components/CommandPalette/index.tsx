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
import { Avatar } from "@components/UI/Avatar.tsx";
import { cn } from "@core/utils/cn.ts";
import { usePinnedItems } from "@core/hooks/usePinnedItems.ts";

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
    setConnectDialogOpen,
    setSelectedDevice,
  } = useAppStore();
  const { getDevices } = useDeviceStore();
  const { setDialogOpen, setActivePage, getNode, connection } = useDevice();
  const { pinnedItems, togglePinnedItem } = usePinnedItems({
    storageName: "pinnedCommandMenuGroups",
  });

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
          subItems: getDevices().map((device) => ({
            label: getNode(device.hardware.myNodeNum)?.user?.longName ??
              device.hardware.myNodeNum.toString(),
            icon: (
              <Avatar
                text={getNode(device.hardware.myNodeNum)?.user?.shortName ??
                  device.hardware.myNodeNum.toString()}
              />
            ),
            action() {
              setSelectedDevice(device.id);
            },
          })),
        },
        {
          label: "Connect New Node",
          icon: PlusIcon,
          action() {
            setConnectDialogOpen(true);
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
          label: "Reboot To OTA Mode",
          icon: RefreshCwIcon,
          action() {
            setDialogOpen("rebootOTA", true);
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
          label: "Clear All Stored Message",
          icon: EraserIcon,
          action() {
            setDialogOpen("deleteMessages", true);
          },
        },
      ],
    },
  ];

  const sortedGroups = [...groups].sort((a, b) => {
    const aPinned = pinnedItems.includes(a.label) ? 1 : 0;
    const bPinned = pinnedItems.includes(b.label) ? 1 : 0;
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
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {sortedGroups.map((group) => (
          <CommandGroup
            key={group.label}
            heading={
              <div className="flex items-center justify-between">
                <span>{group.label}</span>
                <button
                  type="button"
                  onClick={() => togglePinnedItem(group.label)}
                  className={cn(
                    "transition-all duration-300 scale-100 cursor-pointer p-2 focus:*:data-label:opacity-100",
                  )}
                  aria-description={pinnedItems.includes(group.label)
                    ? "Unpin command group"
                    : "Pin command group"}
                >
                  <span
                    data-label
                    className="transition-all block absolute w-full mb-auto mt-auto ml-0 mr-0 text-xs left-0 -top-5 opacity-0 rounded-lg"
                  />
                  <Pin
                    size={16}
                    className={cn(
                      "transition-opacity",
                      pinnedItems.includes(group.label)
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
  if (!search) return null;

  return (
    <CommandItem onSelect={action}>
      {icon}
      {label}
    </CommandItem>
  );
};
