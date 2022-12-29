import type React from "react";

import { Controller, useFieldArray, useForm } from "react-hook-form";

import { Button } from "@app/components/form/Button.js";
import { IconButton } from "@app/components/form/IconButton.js";
import { InfoWrapper } from "@app/components/form/InfoWrapper.js";
import { Input } from "@app/components/form/Input.js";
import { Toggle } from "@app/components/form/Toggle.js";
import { useAppStore } from "@app/core/stores/appStore.js";
import { MapValidation } from "@app/validation/appConfig/map.js";
import { Form } from "@components/form/Form";
import { TrashIcon } from "@heroicons/react/24/outline";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";

export const Map = (): JSX.Element => {
  const { rasterSources, setRasterSources } = useAppStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    control,
    reset
  } = useForm<MapValidation>({
    defaultValues: {
      // wmsSources: wmsSources ?? [
      //   {
      //     url: "",
      //     tileSize: 512,
      //     type: "raster"
      //   }
      // ]
    },
    resolver: classValidatorResolver(MapValidation)
  });

  const { fields, append, remove, insert } = useFieldArray({
    control,
    name: "rasterSources"
  });

  const onSubmit = handleSubmit((data) => {
    setRasterSources(data.rasterSources);
  });

  // useEffect(() => {
  //   reset(rasterSources);
  // }, [reset, rasterSources]);

  return (
    <Form
      title="Map Config"
      breadcrumbs={["App Config", "Map"]}
      reset={() =>
        reset({
          rasterSources
        })
      }
      dirty={isDirty}
      onSubmit={onSubmit}
    >
      <InfoWrapper label="WMS Sources">
        <div className="flex flex-col gap-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex w-full gap-2">
              <Controller
                name={`rasterSources.${index}.enabled`}
                control={control}
                render={({ field: { value, ...rest } }) => (
                  <Toggle checked={value} {...rest} />
                )}
              />
              <Input
                placeholder="Name"
                error={
                  errors.rasterSources
                    ? errors.rasterSources[index]?.title?.message
                    : undefined
                }
                {...register(`rasterSources.${index}.title`)}
              />
              <Input
                placeholder="Tile Size"
                type="number"
                error={
                  errors.rasterSources
                    ? errors.rasterSources[index]?.tileSize?.message
                    : undefined
                }
                {...register(`rasterSources.${index}.tileSize`, {
                  valueAsNumber: true
                })}
              />
              <Input
                placeholder="URL"
                error={
                  errors.rasterSources
                    ? errors.rasterSources[index]?.tiles?.message
                    : undefined
                }
                {...register(`rasterSources.${index}.tiles`)}
              />
              <IconButton
                className="shrink-0"
                icon={<TrashIcon className="w-4" />}
                onClick={() => {
                  remove(index);
                }}
              />
            </div>
          ))}
          <Button
            onClick={() => {
              append({
                enabled: true,
                title: "",
                tiles: [
                  "https://img.nj.gov/imagerywms/Natural2015?bbox={bbox-epsg-3857}&format=image/png&service=WMS&version=1.1.1&request=GetMap&srs=EPSG:3857&transparent=true&width=256&height=256&layers=Natural2015"
                ],
                tileSize: 512
              });
            }}
          >
            New Source
          </Button>
        </div>
      </InfoWrapper>
    </Form>
  );
};
