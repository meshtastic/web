import {
  useDevice,
  useDeviceStore,
  type ValidConfigType,
  type ValidModuleConfigType,
} from "@core/stores";

type UseWaitForConfigProps =
  | { configCase: ValidConfigType; moduleConfigCase?: never }
  | { configCase?: never; moduleConfigCase: ValidModuleConfigType };

export function useWaitForConfig({
  configCase,
  moduleConfigCase,
}: UseWaitForConfigProps): void {
  const device = useDevice();
  const { config, moduleConfig } = device;

  const isDataDefined = configCase
    ? config[configCase] !== undefined
    : moduleConfig[moduleConfigCase as ValidModuleConfigType] !== undefined;

  if (!isDataDefined) {
    throw new Promise<void>((resolve) => {
      const hasRequestedConfig = (): boolean => {
        const current = useDeviceStore.getState().getDevice(device.id);
        if (!current) return false;
        return configCase
          ? current.config[configCase] !== undefined
          : current.moduleConfig[moduleConfigCase as ValidModuleConfigType] !==
              undefined;
      };

      let unsubscribe = (): void => {};
      const check = (): void => {
        if (hasRequestedConfig()) {
          unsubscribe();
          resolve();
        }
      };
      unsubscribe = useDeviceStore.subscribe(check);
      check();
    });
  }
}
