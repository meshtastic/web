import {
  useDevice,
  ValidConfigType,
  ValidModuleConfigType,
} from "@core/stores/deviceStore.ts";
import { useEffect, useState } from "react";

export function ConfigSuspender({
  configCase,
  moduleConfigCase,
  children,
}: {
  configCase?: ValidConfigType;
  moduleConfigCase?: ValidModuleConfigType;
  children: React.ReactNode;
}) {
  const { config, moduleConfig } = useDevice();

  let cfg = undefined;
  if (configCase) {
    cfg = config[configCase];
  } else if (moduleConfigCase) {
    cfg = moduleConfig[moduleConfigCase];
  } else {
    return children;
  }

  const [ready, setReady] = useState(() => cfg !== undefined);

  useEffect(() => {
    if (cfg !== undefined) setReady(true);
  }, [cfg]);

  if (!ready) throw new Promise(() => {}); // triggers suspense fallback

  return children;
}
