import { Protobuf } from "@core/protobuf.ts";

type RegionCode = Protobuf.Config.Config_LoRaConfig_RegionCode;

const Region = Protobuf.Config.Config_LoRaConfig_RegionCode;

export interface RegionChoice {
  readonly value: RegionCode;
  /** The firmware's region code name, e.g. `EU_868`. */
  readonly code: string;
  /** An amateur band: only licensed operators may transmit on it. */
  readonly licensedOnly: boolean;
}

/**
 * Region options for the profile step: the regions this radio accepts, in
 * enum order, without UNSET (a region has to be chosen to transmit).
 */
export function regionChoices(
  allowed: ReadonlyArray<RegionCode>,
  licensedOnly: ReadonlyArray<RegionCode> = [],
): RegionChoice[] {
  return allowed
    .filter((value) => value !== Region.UNSET)
    .map((value) => ({
      value,
      code: Region[value] ?? String(value),
      licensedOnly: licensedOnly.includes(value),
    }));
}

/** Parses a select's string value back into an allowed region code. */
export function parseRegion(
  value: string,
  choices: ReadonlyArray<RegionChoice>,
): RegionCode | undefined {
  return choices.find((choice) => String(choice.value) === value)?.value;
}
