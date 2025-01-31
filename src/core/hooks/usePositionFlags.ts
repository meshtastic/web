import { useCallback, useMemo, useState } from "react";

export type FlagName =
  | "UNSET"
  | "ALTITUDE"
  | "ALTITUDE_MSL"
  | "GEOIDAL_SEPARATION"
  | "DOP"
  | "HVDOP"
  | "SATINVIEW"
  | "SEQ_NO"
  | "TIMESTAMP"
  | "HEADING"
  | "SPEED";

type UsePositionFlagsProps = {
  decode: (value: number) => FlagName[];
  encode: (flagNames: FlagName[]) => number;
  hasFlag: (value: number, flagName: FlagName) => boolean;
  getAllFlags: () => FlagName[];
  isValidValue: (value: number) => boolean;
  flagsValue: number;
  activeFlags: FlagName[];
  toggleFlag: (flagName: FlagName) => void;
  setFlag: (flagName: FlagName, enabled: boolean) => void;
  setFlags: (value: number) => void;
  clearFlags: () => void;
};

const FLAGS_MAP: ReadonlyMap<FlagName, number> = new Map([
  ["UNSET", 0],
  ["ALTITUDE", 1],
  ["ALTITUDE_MSL", 2],
  ["GEOIDAL_SEPARATION", 4],
  ["DOP", 8],
  ["HVDOP", 16],
  ["SATINVIEW", 32],
  ["SEQ_NO", 64],
  ["TIMESTAMP", 128],
  ["HEADING", 256],
  ["SPEED", 512],
]);

export const usePositionFlags = (initialValue = 0): UsePositionFlagsProps => {
  const [flagsValue, setFlagsValue] = useState<number>(initialValue);

  const utils = useMemo(() => {
    const decode = (value: number): FlagName[] => {
      if (value === 0) return ["UNSET"];
      const activeFlags: FlagName[] = [];
      for (const [name, flagValue] of FLAGS_MAP) {
        if (flagValue !== 0 && (value & flagValue) === flagValue) {
          activeFlags.push(name);
        }
      }
      return activeFlags;
    };

    const encode = (flagNames: FlagName[]): number => {
      if (flagNames.includes("UNSET")) {
        return 0;
      }
      return flagNames.reduce((acc, name) => {
        const value = FLAGS_MAP.get(name);
        if (value === undefined) {
          throw new Error(`Invalid flag name: ${name}`);
        }
        return acc | value;
      }, 0);
    };

    const hasFlag = (value: number, flagName: FlagName): boolean => {
      const flagValue = FLAGS_MAP.get(flagName);
      if (flagValue === undefined) {
        throw new Error(`Invalid flag name: ${flagName}`);
      }
      return (value & flagValue) === flagValue;
    };

    const getAllFlags = (): FlagName[] => {
      return Array.from(FLAGS_MAP.keys());
    };

    const isValidValue = (value: number): boolean => {
      const maxValue = Array.from(FLAGS_MAP.values()).reduce(
        (a, b) => a + b,
        0,
      );
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
    const flagValue = FLAGS_MAP.get(flagName);
    if (flagValue === undefined) {
      throw new Error(`Invalid flag name: ${flagName}`);
    }
    setFlagsValue((prev) => prev ^ flagValue);
  }, []);

  const setFlag = useCallback((flagName: FlagName, enabled: boolean) => {
    const flagValue = FLAGS_MAP.get(flagName);
    if (flagValue === undefined) {
      throw new Error(`Invalid flag name: ${flagName}`);
    }
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
