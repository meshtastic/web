import type React from "react";
import { Fragment, useEffect, useState } from "react";

import { toast } from "react-hot-toast";

import { useDevice } from "@app/core/providers/useDevice.js";
import { useAppStore } from "@app/core/stores/appStore.js";
import { useDeviceStore } from "@app/core/stores/deviceStore.js";
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
  ArrowsRightLeftIcon,
  BeakerIcon,
  BugAntIcon,
  Cog8ToothIcon,
  CubeTransparentIcon,
  DevicePhoneMobileIcon,
  DocumentTextIcon,
  IdentificationIcon,
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
import { ThemeController } from "../generic/ThemeController.js";
import { Blur } from "../generic/Blur.js";
import { accentColor } from "@core/stores/appStore.js";

export interface Group {
  name: string;
  icon: (props: React.ComponentProps<"svg">) => JSX.Element;
  commands: Command[];
}
export interface Command {
  name: string;
  icon: (props: React.ComponentProps<"svg">) => JSX.Element;
  action?: () => void;
  subItems?: SubItem[];
}

export interface SubItem {
  name: string;
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

  const {
    setQRDialogOpen,
    setImportDialogOpen,
    setShutdownDialogOpen,
    setRebootDialogOpen,
    setActivePage,
    connection
  } = useDevice();

  const groups: Group[] = [
    {
      name: "Goto",
      icon: LinkIcon,
      commands: [
        {
          name: "Messages",
          icon: InboxIcon,
          action() {
            setActivePage("messages");
          }
        },
        {
          name: "Map",
          icon: MapIcon,
          action() {
            setActivePage("map");
          }
        },
        {
          name: "Extensions",
          icon: BeakerIcon,
          action() {
            setActivePage("extensions");
          }
        },
        {
          name: "Config",
          icon: Cog8ToothIcon,
          action() {
            setActivePage("config");
          }
        },
        {
          name: "Channels",
          icon: Square3Stack3DIcon,
          action() {
            setActivePage("channels");
          }
        },
        {
          name: "Peers",
          icon: UsersIcon,
          action() {
            setActivePage("peers");
          }
        },
        {
          name: "Info",
          icon: IdentificationIcon,
          action() {
            setActivePage("info");
          }
        },
        {
          name: "Logs",
          icon: DocumentTextIcon,
          action() {
            setActivePage("logs");
          }
        }
      ]
    },
    {
      name: "Manage",
      icon: DevicePhoneMobileIcon,
      commands: [
        {
          name: "Switch Node",
          icon: ArrowsRightLeftIcon,
          subItems: getDevices().map((device) => {
            return {
              name:
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
          name: "Connect New Node",
          icon: PlusIcon,
          action() {
            setSelectedDevice(0);
          }
        }
      ]
    },
    {
      name: "Contextual",
      icon: CubeTransparentIcon,
      commands: [
        {
          name: "QR Code",
          icon: QrCodeIcon,
          subItems: [
            {
              name: "Generator",
              icon: <QueueListIcon className="w-4" />,
              action() {
                setQRDialogOpen(true);
              }
            },
            {
              name: "Import",
              icon: <ArrowDownOnSquareStackIcon className="w-4" />,
              action() {
                setImportDialogOpen(true);
              }
            }
          ]
        },
        {
          name: "Reset Peers",
          icon: TrashIcon,
          action() {
            if (connection) {
              void toast.promise(connection.resetPeers({}), {
                loading: "Resetting...",
                success: "Succesfully reset peers",
                error: "No response received"
              });
            }
          }
        },
        {
          name: "Disconnect",
          icon: XCircleIcon,
          action() {
            void connection?.disconnect();
            setSelectedDevice(0);
            removeDevice(selectedDevice ?? 0);
          }
        },
        {
          name: "Schedule Shutdown",
          icon: PowerIcon,
          action() {
            setShutdownDialogOpen(true);
          }
        },
        {
          name: "Schedule Reboot",
          icon: ArrowPathIcon,
          action() {
            setRebootDialogOpen(true);
          }
        }
      ]
    },
    {
      name: "Debug",
      icon: BugAntIcon,
      commands: [
        {
          name: "Reconfigure",
          icon: ArrowPathIcon,
          action() {
            void connection?.configure();
          }
        },
        {
          name: "[WIP] Clear Messages",
          icon: ArchiveBoxXMarkIcon,
          action() {
            alert("This feature is not implemented");
          }
        }
      ]
    },
    {
      name: "Application",
      icon: WindowIcon,
      commands: [
        {
          name: "Toggle Dark Mode",
          icon: MoonIcon,
          action() {
            setDarkMode(!darkMode);
          }
        },
        {
          name: "Accent Color",
          icon: SwatchIcon,
          subItems: [
            {
              name: "Red",
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
              name: "Orange",
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
              name: "Yellow",
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
              name: "Green",
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
              name: "Blue",
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
              name: "Purple",
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
              name: "Pink",
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
                return `${group.name} ${command.name}`
                  .toLowerCase()
                  .includes(query.toLowerCase());
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
