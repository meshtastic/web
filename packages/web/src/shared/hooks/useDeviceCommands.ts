import { deviceCommands } from "@core/services/DeviceCommandService";

/**
 * Hook that provides access to the DeviceCommandService.
 *
 * This hook returns the singleton deviceCommands service, which provides
 * methods for sending messages, waypoints, traceroutes, etc. without
 * needing to pass device references through props.
 *
 * @example
 * ```tsx
 * function MessageInput() {
 *   const commands = useDeviceCommands();
 *
 *   const sendMessage = async () => {
 *     await commands.sendText("Hello!", nodeNum);
 *   };
 * }
 * ```
 */
export function useDeviceCommands() {
  return deviceCommands;
}
