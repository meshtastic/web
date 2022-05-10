import type React from 'react';
import { useEffect, useRef, useState } from 'react';

import { FiMapPin } from 'react-icons/fi';
import { RiRoadMapLine } from 'react-icons/ri';

import { Layout } from '@components/layout';
import { MapboxProvider } from '@components/MapBox/MapboxProvider';
import { useAppSelector } from '@hooks/useAppSelector';
import type { Protobuf } from '@meshtastic/meshtasticjs';
import { MapContainer } from '@app/pages/Map_old/MapContainer';
import { Marker } from '@app/pages/Map_old/Marker';
import { NodeCard } from '@pages/Nodes/NodeCard';

//

import { nodes } from './nodes';

//

import WebMap from '@arcgis/core/WebMap';
import Map from '@arcgis/core/Map';
import WebScene from '@arcgis/core/WebScene';
import SceneView from '@arcgis/core/views/SceneView';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Point from '@arcgis/core/geometry/Point';
import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import TextSymbol from '@arcgis/core/symbols/TextSymbol';
import Feature from '@arcgis/core/widgets/Feature';
import SimpleRenderer from '@arcgis/core/renderers/SimpleRenderer';
import LabelSymbol3D from '@arcgis/core/symbols/LabelSymbol3D';
import TextSymbol3DLayer from '@arcgis/core/symbols/TextSymbol3DLayer';
import LineCallout3D from '@arcgis/core/symbols/callouts/LineCallout3D';
import LabelClass from '@arcgis/core/layers/support/LabelClass';

export const MapPage = (): JSX.Element => {
  const ref = useRef<HTMLDivElement>(null);

  const labelClass = new LabelClass({
    labelExpressionInfo: {
      expression: '$feature.name',
    },
    symbol: new LabelSymbol3D({
      symbolLayers: [
        new TextSymbol3DLayer({
          text: '{name}',
          material: {
            color: 'black',
          },
          halo: {
            color: [255, 255, 255, 0.7],
            size: 2,
          },
          font: {
            size: 12,
            weight: 'bold',
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
  });

  const points: Graphic[] = nodes.map(
    (node, index) =>
      new Graphic({
        geometry: new Point({
          latitude: node.lat,
          longitude: node.lng,
        }),
        attributes: {
          ObjectID: index,
          name: node.name,
        },
      }),
  );

  useEffect(() => {
    if (ref.current) {
      const layer = new FeatureLayer({
        labelsVisible: true,
        labelingInfo: [labelClass],
        source: points,
        fields: [
          {
            name: 'ObjectID',
            alias: 'ObjectID',
            type: 'oid',
          },
          {
            name: 'name',
            alias: 'Name',
            type: 'string',
          },
        ],
      });

      const map = new Map({
        basemap: 'satellite',
        ground: 'world-elevation',
        layers: [layer],
      });

      const scene = new SceneView({
        container: ref.current,
        map: map,
        camera: {
          position: {
            y: -35.59, //Longitude
            x: 148, //Latitude
            z: 200, //Meters
          },
          tilt: 75,
        },
      });
    }
  }, []);

  return (
    <Layout
      title="Nodes"
      icon={<RiRoadMapLine />}
      sidebarContents={<div className="flex flex-col gap-2"></div>}
    >
      <div className="w-full" ref={ref}></div>
    </Layout>
  );

  // const [selectedNode, setSelectedNode] = useState<Protobuf.NodeInfo>();

  // const nodes = useAppSelector((state) => state.meshtastic.nodes);
  // const myNodeNum = useAppSelector(
  //   (state) => state.meshtastic.radio.hardware.myNodeNum,
  // );

  // return (
  //   <MapboxProvider>
  //     {nodes.map((node) => {
  //       return (
  //         node.data.position && (
  //           <Marker
  //             key={node.data.num}
  //             center={
  //               new mapboxgl.LngLat(
  //                 node.data.position.longitudeI / 1e7,
  //                 node.data.position.latitudeI / 1e7,
  //               )
  //             }
  //           >
  //             <div
  //               onClick={(): void => {
  //                 setSelectedNode(node.data);
  //               }}
  //               className={`z-50 rounded-full  border-2 bg-opacity-30 ${
  //                 node.data.num === selectedNode?.num
  //                   ? 'border-green-500 bg-green-500'
  //                   : 'border-blue-500 bg-blue-500'
  //               }`}
  //             >
  //               <div className="m-4 ">
  //                 <FiMapPin className="h-5 w-5" />
  //               </div>
  //             </div>
  //           </Marker>
  //         )
  //       );
  //     })}
  //     <Layout
  //       title="Nodes"
  //       icon={<RiRoadMapLine />}
  //       sidebarContents={
  //         <div className="flex flex-col gap-2">
  //           {!nodes.length && (
  //             <span className="p-4 text-sm text-gray-400 dark:text-gray-600">
  //               No nodes found.
  //             </span>
  //           )}

  //           {nodes.map((node) => (
  //             <NodeCard
  //               key={node.data.num}
  //               node={node.data}
  //               isMyNode={node.data.num === myNodeNum}
  //               selected={selectedNode?.num === node.data.num}
  //               setSelected={(): void => {
  //                 setSelectedNode(node.data);
  //               }}
  //             />
  //           ))}
  //         </div>
  //       }
  //     >
  //       <MapContainer />
  //     </Layout>
  //   </MapboxProvider>
  // );
};
