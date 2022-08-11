import type React from "react";

import {
  Button,
  majorScale,
  Pane,
  SelectField,
  TextInputField,
} from "evergreen-ui";

import { useDevice } from "@app/core/stores/deviceStore.js";
import { renderOptions } from "@app/core/utils/selectEnumOptions.js";
import { Protobuf } from "@meshtastic/meshtasticjs";

enum LocationType {
  MGRS,
  LatLng,
  DecimalDegrees,
}

export const NewLocationMessage = (): JSX.Element => {
  const { connection } = useDevice();

  return (
    <Pane width={240} margin={majorScale(2)}>
      <form
        onSubmit={(e): void => {
          e.preventDefault();
        }}
      >
        <TextInputField label="Name" />
        <TextInputField label="Description" />
        <SelectField label="Type" value={LocationType.MGRS}>
          {renderOptions(LocationType)}
        </SelectField>
        <TextInputField label="Coordinates" />
        <Button
          width="100%"
          onClick={() => {
            void connection?.sendLocation(
              Protobuf.Location.create({
                latitudeI: Math.floor(3.89103 * 1e7),
                longitudeI: Math.floor(105.87005 * 1e7),
                name: "TEST",
                description: "This is a description",
              })
            );
          }}
        >
          Send
        </Button>
      </form>
    </Pane>
  );
};
