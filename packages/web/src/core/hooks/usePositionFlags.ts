import { useCallback, useMemo, useState } from "react";

export const FLAGS_CONFIG = {
  UNSET: { value: 0, i18nKey: "position.flags.unset" },
  ALTITUDE: { value: 1, i18nKey: "position.flags.altitude" },
  ALTITUDE_MSL: { value: 2, i18nKey: "position.flags.altitudeMsl" },
  ALTITUDE_GEOIDAL_SEPARATION: {
    value: 4,
    i18nKey: "position.flags.altitudeGeoidalSeparation",
  },
  DOP: {
    value: 8,
    i18nKey: "position.flags.dop",
  },
  HDOP_VDOP: {
    value: 16,
    i18nKey: "position.flags.hdopVdop",
  },
  NUM_SATELLITES: {
    value: 32,
    i18nKey: "position.flags.numSatellites",
  },
  SEQUENCE_NUMBER: {
    value: 64,
    i18nKey: "position.flags.sequenceNumber",
  },
  TIMESTAMP: { value: 128, i18nKey: "position.flags.timestamp" },
  VEHICLE_HEADING: {
    value: 256,
    i18nKey: "position.flags.vehicleHeading",
  },
  VEHICLE_SPEED: { value: 512, i18nKey: "position.flags.vehicleSpeed" },
} as const;

export type FlagName = keyof typeof FLAGS_CONFIG;

type UsePositionFlagsProps = {
  decode: (value: number) => FlagName[];
  encode: (flagNames: FlagName[]) => number;
  hasFlag: (value: number, flagName: FlagName) => boolean;
  getAllFlags: () => typeof FLAGS_CONFIG;
  isValidValue: (value: number) => boolean;
  flagsValue: number;
  activeFlags: FlagName[];
  toggleFlag: (flagName: FlagName) => void;
  setFlag: (flagName: FlagName, enabled: boolean) => void;
  setFlags: (value: number) => void;
  clearFlags: () => void;
};

export const usePositionFlags = (initialValue = 0): UsePositionFlagsProps => {
  const [flagsValue, setFlagsValue] = useState<number>(initialValue);

  const FLAGS_BITMASKS = useMemo(() => {
    return Object.fromEntries(
      Object.entries(FLAGS_CONFIG).map(([key, conf]) => [key, conf.value]),
    ) as { [K in FlagName]: (typeof FLAGS_CONFIG)[K]["value"] };
  }, []);

  const utils = useMemo(() => {
    const decode = (value: number): FlagName[] => {
      if (value === FLAGS_CONFIG.UNSET.value) {
        return ["UNSET"];
      }

      const activeFlags: FlagName[] = [];
      for (const key in FLAGS_CONFIG) {
        const flagName = key as FlagName;
        const flagConfig = FLAGS_CONFIG[flagName];
        if (
          flagConfig.value !== 0 &&
          (value & flagConfig.value) === flagConfig.value
        ) {
          activeFlags.push(flagName);
        }
      }
      return activeFlags;
    };

    const encode = (flagNames: FlagName[]): number => {
      if (flagNames.includes("UNSET") && flagNames.length === 1) {
        return FLAGS_CONFIG.UNSET.value;
      }
      return flagNames.reduce((acc, name) => {
        if (name === "UNSET") {
          return acc;
        }
        return acc | FLAGS_CONFIG[name].value;
      }, 0);
    };

    const hasFlag = (value: number, flagName: FlagName): boolean => {
      return (
        (value & FLAGS_CONFIG[flagName].value) === FLAGS_CONFIG[flagName].value
      );
    };

    const getAllFlags = (): typeof FLAGS_CONFIG => {
      return FLAGS_CONFIG;
    };

    const isValidValue = (value: number): boolean => {
      const maxValue = Object.values(FLAGS_BITMASKS)
        .filter((val) => val !== 0)
        .reduce((acc, val) => acc | val, 0);
      return Number.isInteger(value) && value >= 0 && value <= maxValue;
    };

    return {
      decode,
      encode,
      hasFlag,
      getAllFlags,
      isValidValue,
    };
  }, [FLAGS_BITMASKS]);

  const toggleFlag = useCallback((flagName: FlagName) => {
    setFlagsValue((prev) => prev ^ FLAGS_CONFIG[flagName].value);
  }, []);

  const setFlag = useCallback((flagName: FlagName, enabled: boolean) => {
    const currentFlagValue = FLAGS_CONFIG[flagName].value;
    setFlagsValue((prev) =>
      enabled ? prev | currentFlagValue : prev & ~currentFlagValue,
    );
  }, []);

  const setFlags = useCallback(
    (value: number) => {
      if (!utils.isValidValue(value)) {
        throw new Error(`Invalid flags value: ${value}`);
      }
      setFlagsValue(value);
    },
    [utils],
  );

  const clearFlags = useCallback(() => {
    setFlagsValue(FLAGS_CONFIG.UNSET.value);
  }, []);

  const activeFlags = utils.decode(flagsValue);

  return {
    ...utils,
    flagsValue,
    activeFlags,
    toggleFlag,
    setFlag,
    setFlags,
    clearFlags,
  };
};
