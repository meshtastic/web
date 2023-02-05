import { ComponentType, Fragment, SVGProps, useEffect, useState } from "react";
import { useDevice } from "@core/stores/deviceStore.js";
import { useAppStore } from "@core/stores/appStore.js";
import { useDeviceStore } from "@core/stores/deviceStore.js";
import { GroupView } from "@components/CommandPalette/GroupView.js";
import { NoResults } from "@components/CommandPalette/NoResults.js";
import { PaletteTransition } from "@components/CommandPalette/PaletteTransition.js";
import { SearchBox } from "@components/CommandPalette/SearchBox.js";
import { SearchResult } from "@components/CommandPalette/SearchResult.js";
import { Hashicon } from "@emeraldpay/hashicon-react";
import { Combobox, Dialog, Transition } from "@headlessui/react";
import {
  LucideIcon,
  LinkIcon,
  TrashIcon,
  MapIcon,
  MoonIcon,
  PlusIcon,
  PowerIcon,
  EraserIcon,
  ImportIcon,
  RefreshCwIcon,
  FactoryIcon,
  ArrowLeftRightIcon,
  BugIcon,
  SettingsIcon,
  SmartphoneIcon,
  MessageSquareIcon,
  QrCodeIcon,
  LayersIcon,
  PaletteIcon,
  UsersIcon,
  LayoutIcon,
  XCircleIcon,
  BoxSelectIcon
} from "lucide-react";
import { Blur } from "@components/generic/Blur.js";
import { ThemeController } from "@components/generic/ThemeController.js";

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
  const [query, setQuery] = useState("");
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setSelectedDevice,
    removeDevice,
    selectedDevice,
    darkMode,
    setDarkMode,
    setAccent
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
          }
        },
        {
          label: "Map",
          icon: MapIcon,
          action() {
            setActivePage("map");
          }
        },
        {
          label: "Config",
          icon: SettingsIcon,
          action() {
            setActivePage("config");
          },
          tags: ["settings"]
        },
        {
          label: "Channels",
          icon: LayersIcon,
          action() {
            setActivePage("channels");
          }
        },
        {
          label: "Peers",
          icon: UsersIcon,
          action() {
            setActivePage("peers");
          }
        }
      ]
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
                device.nodes.find(
                  (n) => n.data.num === device.hardware.myNodeNum
                )?.data.user?.longName ?? device.hardware.myNodeNum.toString(),
              icon: (
                <Hashicon
                  size={16}
                  value={device.hardware.myNodeNum.toString()}
                />
              ),
              action() {
                setSelectedDevice(device.id);
              }
            };
          })
        },
        {
          label: "Connect New Node",
          icon: PlusIcon,
          action() {
            setSelectedDevice(0);
          }
        }
      ]
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
              }
            },
            {
              label: "Import",
              icon: <QrCodeIcon size={16} />,
              action() {
                setDialogOpen("import", true);
              }
            }
          ]
        },
        {
          label: "Disconnect",
          icon: XCircleIcon,
          action() {
            void connection?.disconnect();
            setSelectedDevice(0);
            removeDevice(selectedDevice ?? 0);
          }
        },
        {
          label: "Schedule Shutdown",
          icon: PowerIcon,
          action() {
            setDialogOpen("shutdown", true);
          }
        },
        {
          label: "Schedule Reboot",
          icon: RefreshCwIcon,
          action() {
            setDialogOpen("reboot", true);
          }
        },
        {
          label: "Reset Peers",
          icon: TrashIcon,
          action() {
            connection?.resetPeers();
          }
        },
        {
          label: "Factory Reset",
          icon: FactoryIcon,
          action() {
            connection?.factoryReset();
          }
        }
      ]
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
          }
        },
        {
          label: "[WIP] Clear Messages",
          icon: EraserIcon,
          action() {
            alert("This feature is not implemented");
          }
        }
      ]
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
          }
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
              }
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
              }
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
              }
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
              }
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
              }
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
              }
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
              }
            }
          ]
        }
      ]
    }
  ];

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setCommandPaletteOpen(true);
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  const filtered =
    query === ""
      ? []
      : groups
          .map((group) => {
            return {
              ...group,
              commands: group.commands.filter((command) => {
                const nameIncludes = `${group.label} ${command.label}`
                  .toLowerCase()
                  .includes(query.toLowerCase());

                const tagsInclude = (
                  command.tags
                    ?.map((t) => t.includes(query.toLowerCase()))
                    .filter(Boolean) ?? []
                ).length;

                const subItemsInclude = (
                  command.subItems
                    ?.map((s) =>
                      s.label.toLowerCase().includes(query.toLowerCase())
                    )
                    .filter(Boolean) ?? []
                ).length;
                return nameIncludes || tagsInclude || subItemsInclude;
              })
            };
          })
          .filter((group) => group.commands.length);

  return (
    <Transition.Root
      show={commandPaletteOpen}
      as={Fragment}
      afterLeave={() => setQuery("")}
      appear
    >
      <Dialog
        as="div"
        className="relative z-10"
        onClose={setCommandPaletteOpen}
      >
        <ThemeController>
          <Blur />
          <PaletteTransition>
            <Dialog.Panel className="mx-auto max-w-2xl transform overflow-hidden rounded-md bg-backgroundPrimary transition-all">
              <Combobox<Command | string>
                onChange={(input) => {
                  if (typeof input === "string") {
                    setQuery(input);
                  } else if (input.action) {
                    setCommandPaletteOpen(false);
                    input.action();
                  }
                }}
              >
                <SearchBox setQuery={setQuery} />

                {query === "" || filtered.length > 0 ? (
                  <Combobox.Options
                    static
                    className="max-h-80 scroll-py-2 divide-y divide-opacity-10 overflow-y-auto bg-backgroundSecondary"
                  >
                    <li className="p-2">
                      <ul className="flex flex-col gap-2 text-sm text-textSecondary">
                        {filtered.map((group, index) => (
                          <SearchResult key={index} group={group} />
                        ))}
                        {query === "" &&
                          groups.map((group, index) => (
                            <GroupView key={index} group={group} />
                          ))}
                      </ul>
                    </li>
                  </Combobox.Options>
                ) : (
                  query !== "" && filtered.length === 0 && <NoResults />
                )}
              </Combobox>
            </Dialog.Panel>
          </PaletteTransition>
        </ThemeController>
      </Dialog>
    </Transition.Root>
  );
};
