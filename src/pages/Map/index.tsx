import type React from "react";
import { useEffect, useMemo, useRef } from "react";

import { Pane } from "evergreen-ui";

import { useDevice } from "@app/core/stores/deviceStore.js";
import Point from "@arcgis/core/geometry/Point";
import Graphic from "@arcgis/core/Graphic";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import LabelClass from "@arcgis/core/layers/support/LabelClass";
import Map from "@arcgis/core/Map";
import LineCallout3D from "@arcgis/core/symbols/callouts/LineCallout3D";
import LabelSymbol3D from "@arcgis/core/symbols/LabelSymbol3D";
import TextSymbol3DLayer from "@arcgis/core/symbols/TextSymbol3DLayer";
import SceneView from "@arcgis/core/views/SceneView";

export const MapPage = (): JSX.Element => {
  const { nodes } = useDevice();

  const nodesWithPosition = nodes.filter((node) => node.data.position);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log(nodesWithPosition);
  }, [nodesWithPosition]);

  const labelClass = useMemo(
    () =>
      new LabelClass({
        labelExpressionInfo: {
          expression: "$feature.name",
        },
        symbol: new LabelSymbol3D({
          symbolLayers: [
            new TextSymbol3DLayer({
              text: "{name}",
              material: {
                color: "black",
              },
              halo: {
                color: [255, 255, 255, 0.7],
                size: 2,
              },
              font: {
                size: 12,
                weight: "bold",
              },
              size: 10,
            }),
          ],
          verticalOffset: {
            screenLength: 150,
            maxWorldLength: 2000,
            minWorldLength: 30,
          },
          callout: new LineCallout3D({
            size: 0.5,
            color: [0, 0, 0],
            border: {
              color: [255, 255, 255],
            },
          }),
        }),
      }),
    []
  );

  const points: Graphic[] = nodesWithPosition.map(
    (node, index) =>
      node.data.position
        ? new Graphic({
            geometry: new Point({
              latitude: node.data.position.latitudeI / 1e7,
              longitude: node.data.position.longitudeI / 1e7,
            }),
            attributes: {
              ObjectID: index,
              name: node.data.user?.longName,
            },
          })
        : new Graphic() //should be undefined/removed from array
  );

  useEffect(() => {
    if (ref.current) {
      const layer = new FeatureLayer({
        labelsVisible: true,
        labelingInfo: [labelClass],
        source: points,
        fields: [
          {
            name: "ObjectID",
            alias: "ObjectID",
            type: "oid",
          },
          {
            name: "name",
            alias: "Name",
            type: "string",
          },
        ],
      });

      const map = new Map({
        basemap: "satellite",
        ground: "world-elevation",
        layers: [layer],
      });

      const scene = new SceneView({
        container: ref.current,
        map: map,
        camera: {
          position: nodesWithPosition[0]
            ? {
                x: nodesWithPosition[0].data.position?.longitudeI ?? 0 / 1e7,
                y: nodesWithPosition[0].data.position?.latitudeI ?? 0 / 1e7,
                z: nodesWithPosition[0].data.position?.altitude ?? 0 / 1e7,
              }
            : {
                y: -35.59, //Longitude
                x: 148, //Latitude
                z: 200, //Meters
              },
          tilt: 75,
        },
      });
      scene.on("click", (event) => {
        void scene.hitTest(event).then((point) => {
          console.log(point);
        });
      });
    }
  }, [labelClass, points]);

  return <Pane width="100%" height="100%" ref={ref} />;
};
