import {
  useDevice,
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
  const { config, moduleConfig } = useDevice();

  const isDataDefined = configCase
    ? config[configCase] !== undefined
    : moduleConfig[moduleConfigCase as ValidModuleConfigType] !== undefined;

  // For module configs, don't suspend if data is undefined - let the form handle empty state
  // This allows the form to render even when the module isn't configured on the device
  if (!isDataDefined && !moduleConfigCase) {
    throw new Promise<void>(() => {});
  }
}
