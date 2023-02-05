import { Input } from "@components/form/Input.js";
import { Select } from "@components/form/Select.js";
import { Button } from "@components/form/Button.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { renderOptions } from "@core/utils/selectEnumOptions.js";
import { Protobuf } from "@meshtastic/meshtasticjs";

enum LocationType {
  MGRS,
  LatLng,
  DecimalDegrees
}

export const NewLocationMessage = (): JSX.Element => {
  const { connection } = useDevice();

  return (
    <div className="m-4 w-96">
      <form
        onSubmit={(e): void => {
          e.preventDefault();
        }}
      >
        <Input label="Name" />
        <Input label="Description" />
        <Select label="Type" value={LocationType.MGRS}>
          {renderOptions(LocationType)}
        </Select>
        <Input label="Coordinates" />
        <Button
          onClick={() => {
            void connection?.sendWaypoint(
              new Protobuf.Waypoint({
                latitudeI: Math.floor(3.89103 * 1e7),
                longitudeI: Math.floor(105.87005 * 1e7),
                name: "TEST",
                description: "This is a description"
              }),
              "broadcast"
            );
          }}
        >
          Send
        </Button>
      </form>
    </div>
  );
};
