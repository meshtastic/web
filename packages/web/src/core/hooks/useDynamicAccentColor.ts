import { useDeviceContext, useDeviceStore } from "@core/stores";
import { getAvatarColors } from "@core/utils/avatarColors";
import { useEffect } from "react";

export function useDynamicAccentColor() {
  const { deviceId } = useDeviceContext();
  const device = useDeviceStore((s) => s.getDevice(deviceId));
  const myNode = device?.hardware?.myNodeNum;

  useEffect(() => {
    const root = document.documentElement;
    if (myNode !== undefined) {
      const { bgColor, textColor } = getAvatarColors(myNode);
      root.style.setProperty("--dynamic-node-color", bgColor);
      root.style.setProperty("--dynamic-node-color-foreground", textColor);
    } else {
      // Fallback to black/white if no node is connected
      root.style.setProperty("--dynamic-node-color", "oklch(0 0 0)");
      root.style.setProperty("--dynamic-node-color-foreground", "oklch(1 0 0)");
    }
  }, [myNode]);
}
