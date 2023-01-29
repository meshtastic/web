import { ComponentType, Fragment, SVGProps, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useDevice } from "@core/providers/useDevice.js";
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
  ArchiveBoxXMarkIcon,
  ArrowDownOnSquareStackIcon,
  ArrowPathIcon,
  ArrowPathRoundedSquareIcon,
  ArrowsRightLeftIcon,
  BeakerIcon,
  BugAntIcon,
  Cog8ToothIcon,
  CubeTransparentIcon,
  DevicePhoneMobileIcon,
  InboxIcon,
  LinkIcon,
  MapIcon,
  MoonIcon,
  PlusIcon,
  PowerIcon,
  QrCodeIcon,
  QueueListIcon,
  Square3Stack3DIcon,
  SwatchIcon,
  TrashIcon,
  UsersIcon,
  WindowIcon,
  XCircleIcon
} from "@heroicons/react/24/outline";
import { Blur } from "@components/generic/Blur.js";
import { ThemeController } from "@components/generic/ThemeController.js";

export interface Group {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  commands: Command[];
}
export interface Command {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
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
    devices,
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
          icon: InboxIcon,
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
          icon: Cog8ToothIcon,
          action() {
            setActivePage("config");
          },
          tags: ["settings"]
        },
        {
          label: "Channels",
          icon: Square3Stack3DIcon,
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
      icon: DevicePhoneMobileIcon,
      commands: [
        {
          label: "Switch Node",
          icon: ArrowsRightLeftIcon,
          subItems: getDevices().map((device) => {
            return {
              label:
                device.nodes.find(
                  (n) => n.data.num === device.hardware.myNodeNum
                )?.data.user?.longName ?? device.hardware.myNodeNum.toString(),
              icon: (
                <Hashicon
                  size={18}
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
      icon: CubeTransparentIcon,
      commands: [
        {
          label: "QR Code",
          icon: QrCodeIcon,
          subItems: [
            {
              label: "Generator",
              icon: <QueueListIcon className="w-4" />,
              action() {
                setDialogOpen("QR", true);
              }
            },
            {
              label: "Import",
              icon: <ArrowDownOnSquareStackIcon className="w-4" />,
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
          icon: ArrowPathIcon,
          action() {
            setDialogOpen("reboot", true);
          }
        },
        {
          label: "Reset Peers",
          icon: TrashIcon,
          action() {
            if (connection) {
              void toast.promise(connection.resetPeers(), {
                loading: "Resetting...",
                success: "Succesfully reset peers",
                error: "No response received"
              });
            }
          }
        },
        {
          label: "Factory Reset",
          icon: ArrowPathRoundedSquareIcon,
          action() {
            if (connection) {
              void toast.promise(connection.factoryReset(), {
                loading: "Resetting...",
                success: "Succesfully factory peers",
                error: "No response received"
              });
            }
          }
        }
      ]
    },
    {
      label: "Debug",
      icon: BugAntIcon,
      commands: [
        {
          label: "Reconfigure",
          icon: ArrowPathIcon,
          action() {
            void connection?.configure();
          }
        },
        {
          label: "[WIP] Clear Messages",
          icon: ArchiveBoxXMarkIcon,
          action() {
            alert("This feature is not implemented");
          }
        }
      ]
    },
    {
      label: "Application",
      icon: WindowIcon,
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
          icon: SwatchIcon,
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
