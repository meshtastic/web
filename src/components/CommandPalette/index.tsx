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
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

  const groups: Group[] = [
    {
      label: t("command_palette_goto_label"),
      icon: LinkIcon,
      commands: [
        {
          label: t("command_palette_goto_command_messages"),
          icon: MessageSquareIcon,
          action() {
            setActivePage("messages");
          },
        },
        {
          label: t("command_palette_goto_command_map"),
          icon: MapIcon,
          action() {
            setActivePage("map");
          },
        },
        {
          label: t("command_palette_goto_command_config"),
          icon: SettingsIcon,
          action() {
            setActivePage("config");
          },
          tags: ["settings"],
        },
        {
          label: t("command_palette_goto_command_channels"),
          icon: LayersIcon,
          action() {
            setActivePage("channels");
          },
        },
        {
          label: t("command_palette_goto_command_nodes"),
          icon: UsersIcon,
          action() {
            setActivePage("nodes");
          },
        },
      ],
    },
    {
      label: t("command_palette_manage_label"),
      icon: SmartphoneIcon,
      commands: [
        {
          label: t("command_palette_manage_command_switch_node"),
          icon: ArrowLeftRightIcon,
          subItems: getDevices().map((device) => ({
            label: getNode(device.hardware.myNodeNum)?.user?.longName ??
              t("common.unknown"), // Or a more specific key for node name
            icon: (
              <Avatar
                text={getNode(device.hardware.myNodeNum)?.user?.shortName ??
                  t("common.unknown")} // Or a more specific key
              />
            ),
            action() {
              setSelectedDevice(device.id);
            },
          })),
        },
        {
          label: t("command_palette_manage_command_connect_new_node"),
          icon: PlusIcon,
          action() {
            setConnectDialogOpen(true);
          },
        },
      ],
    },
    {
      label: t("command_palette_contextual_label"),
      icon: BoxSelectIcon,
      commands: [
        {
          label: t("command_palette_contextual_command_qr_code"),
          icon: QrCodeIcon,
          subItems: [
            {
              label: t("command_palette_contextual_command_qr_generator"),
              icon: <QrCodeIcon size={16} />,
              action() {
                setDialogOpen("QR", true);
              },
            },
            {
              label: t("command_palette_contextual_command_qr_import"),
              icon: <QrCodeIcon size={16} />,
              action() {
                setDialogOpen("import", true);
              },
            },
          ],
        },
        {
          label: t("command_palette_contextual_command_schedule_shutdown"),
          icon: PowerIcon,
          action() {
            setDialogOpen("shutdown", true);
          },
        },
        {
          label: t("command_palette_contextual_command_schedule_reboot"),
          icon: RefreshCwIcon,
          action() {
            setDialogOpen("reboot", true);
          },
        },
        {
          label: t("command_palette_contextual_command_reboot_to_ota_mode"),
          icon: RefreshCwIcon,
          action() {
            setDialogOpen("rebootOTA", true);
          },
        },
        {
          label: t("command_palette_contextual_command_reset_nodes"),
          icon: TrashIcon,
          action() {
            connection?.resetNodes();
          },
        },
        {
          label: t("command_palette_contextual_command_factory_reset_device"),
          icon: FactoryIcon,
          action() {
            connection?.factoryResetDevice();
          },
        },
        {
          label: t("command_palette_contextual_command_factory_reset_config"),
          icon: FactoryIcon,
          action() {
            connection?.factoryResetConfig();
          },
        },
      ],
    },
    {
      label: t("command_palette_debug_label"),
      icon: BugIcon,
      commands: [
        {
          label: t("command_palette_debug_command_reconfigure"),
          icon: RefreshCwIcon,
          action() {
            void connection?.configure();
          },
        },
        {
          label: t("command_palette_debug_command_clear_all_stored_messages"),
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
      <CommandInput placeholder={t("command_palette_input_placeholder")} />
      <CommandList>
        <CommandEmpty>{t("command_palette_empty_message")}</CommandEmpty>
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
                    ? t("command_palette_unpin_group_aria_label")
                    : t("command_palette_pin_group_aria_label")}
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
