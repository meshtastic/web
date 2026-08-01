import {
  useDevice,
  useDeviceStore,
  type ValidConfigType,
  type ValidModuleConfigType,
} from "@core/stores";

type UseWaitForConfigProps =
  | { configCase: ValidConfigType; moduleConfigCase?: never }
  | { configCase?: never; moduleConfigCase: ValidModuleConfigType };

const pendingConfigWaiters = new Map<string, Promise<void>>();

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
    const configKey = configCase ?? `module:${moduleConfigCase}`;
    const waiterKey = `${device.id}:${configKey}`;
    const existingWaiter = pendingConfigWaiters.get(waiterKey);
    if (existingWaiter) {
      throw existingWaiter;
    }

    const waiter = new Promise<void>((resolve) => {
      const isWaitComplete = (): boolean => {
        const current = useDeviceStore.getState().getDevice(device.id);
        if (!current) return true;
        return configCase
          ? current.config[configCase] !== undefined
          : current.moduleConfig[moduleConfigCase as ValidModuleConfigType] !==
              undefined;
      };

      let unsubscribe = (): void => {};
      const check = (): void => {
        if (isWaitComplete()) {
          unsubscribe();
          resolve();
        }
      };
      unsubscribe = useDeviceStore.subscribe(check);
      check();
    });
    pendingConfigWaiters.set(waiterKey, waiter);
    void waiter.finally(() => pendingConfigWaiters.delete(waiterKey));
    throw waiter;
  }
}
