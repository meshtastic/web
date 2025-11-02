import { useMemo } from "react";

export type BrowserFeature = "Web Bluetooth" | "Web Serial" | "Secure Context";

interface BrowserSupport {
  supported: BrowserFeature[];
  unsupported: BrowserFeature[];
}

export function useBrowserFeatureDetection(): BrowserSupport {
  const support = useMemo(() => {
    const features: [BrowserFeature, boolean][] = [
      ["Web Bluetooth", !!navigator.bluetooth],
      ["Web Serial", !!navigator.serial],
      [
        "Secure Context",
        true,
        // globalThis.location.protocol === "https:" ||
        //   globalThis.location.hostname === "localhost" ||
        //   globalThis.location.hostname === "file:",
      ],
    ];

    return features.reduce<BrowserSupport>(
      (acc, [feature, isSupported]) => {
        const list = isSupported ? acc.supported : acc.unsupported;
        list.push(feature);
        return acc;
      },
      { supported: [], unsupported: [] },
    );
  }, []);

  return support;
}
