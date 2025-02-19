import { useCallback, useMemo, useState } from "react";

const FLAGS = {
  UNSET: 0,
  Altitude: 1,
  "Altitude is Mean Sea Level": 2,
  "Altitude Geoidal Seperation": 4,
  "Dilution of precision (DOP) PDOP used by default": 8,
  "If DOP is set, use HDOP / VDOP values instead of PDOP": 16,
  "Number of satellites": 32,
  "Sequence number": 64,
  Timestamp: 128,
  "Vehicle heading": 256,
  "Vehicle speed": 512,
} as const;

export type FlagName = keyof typeof FLAGS;
type FlagsObject = typeof FLAGS;

type UsePositionFlagsProps = {
  decode: (value: number) => FlagName[];
  encode: (flagNames: FlagName[]) => number;
  hasFlag: (value: number, flagName: FlagName) => boolean;
  getAllFlags: () => FlagsObject;
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

  const utils = useMemo(() => {
    const decode = (value: number): FlagName[] => {
      if (value === 0) return ["UNSET"];

      const activeFlags: FlagName[] = [];
      for (const [name, flagValue] of Object.entries(FLAGS)) {
        if (flagValue !== 0 && (value & flagValue) === flagValue) {
          activeFlags.push(name as FlagName);
        }
      }
      return activeFlags;
    };

    const encode = (flagNames: FlagName[]): number => {
      if (flagNames.includes("UNSET")) {
        return 0;
      }
      return flagNames.reduce((acc, name) => {
        const value = FLAGS[name];
        return acc | value;
      }, 0);
    };

    const hasFlag = (value: number, flagName: FlagName): boolean => {
      const flagValue = FLAGS[flagName];
      return (value & flagValue) === flagValue;
    };

    const getAllFlags = (): FlagsObject => {
      return FLAGS;
    };

    const isValidValue = (value: number): boolean => {
      const maxValue = Object.values(FLAGS)
        .filter((val) => val !== 0) // Exclude UNSET (0) from the calculation
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
  }, []);

  const toggleFlag = useCallback((flagName: FlagName) => {
    const flagValue = FLAGS[flagName];
    setFlagsValue((prev) => prev ^ flagValue);
  }, []);

  const setFlag = useCallback((flagName: FlagName, enabled: boolean) => {
    const flagValue = FLAGS[flagName];
    setFlagsValue((prev) => (enabled ? prev | flagValue : prev & ~flagValue));
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
    setFlagsValue(0);
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
