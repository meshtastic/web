import React, { useState } from "react";

import {
  bitwiseDecode,
  bitwiseEncode,
  enumLike
} from "@app/core/utils/bitwise.js";
import { InfoWrapper } from "@components/form/InfoWrapper.js";
import { Listbox } from "@headlessui/react";
import { Protobuf } from "@meshtastic/meshtasticjs";

export interface BitwiseSelectProps {
  label?: string;
  description?: string;
  error?: string;
  selected: number;
  decodeEnun: enumLike;
  onChange: (value: number) => void;
}

export const BitwiseSelect = ({
  label,
  description,
  error,
  selected,
  decodeEnun,
  onChange
}: BitwiseSelectProps): JSX.Element => {
  const [decodedSelected, setDecodedSelected] = useState<string[]>([]);

  const options = Object.entries(decodeEnun)
    .filter((value) => typeof value[1] !== "number")
    .map((value) => {
      return {
        value: parseInt(value[0]),
        label: value[1]
          .toString()
          .replace("POS_", "")
          .toLowerCase()
          .toLocaleUpperCase() //TODO: Investigate
      };
    });

  React.useEffect(() => {
    setDecodedSelected(
      bitwiseDecode(selected, Protobuf.Config_PositionConfig_PositionFlags).map(
        (flag) =>
          Protobuf.Config_PositionConfig_PositionFlags[flag]
            .replace("POS_", "")
            .toLowerCase()
      )
    );
  }, [selected]);

  return (
    <InfoWrapper label={label} description={description} error={error}>
      <Listbox
        value={bitwiseDecode(selected, decodeEnun)}
        onChange={(value) => {
          onChange(bitwiseEncode(value));
        }}
        multiple
      >
        <Listbox.Button
          className={`bg-orange-100 focus:ring-orange-500 flex h-10 w-full items-center gap-2 rounded-md border-transparent px-3 text-sm focus:border-transparent focus:outline-none focus:ring-2`}
        >
          {decodedSelected.map((option) => (
            <span className="bg-orange-300 rounded-md p-1">{option}</span>
          ))}
        </Listbox.Button>
        <Listbox.Options>
          {options.map((option) => (
            <Listbox.Option key={option.value} value={option.value}>
              {option.label}
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </Listbox>
    </InfoWrapper>
  );
};
