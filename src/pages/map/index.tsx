import type React from 'react';
import { useEffect, useRef, useState } from 'react';

import mapboxgl from 'mapbox-gl';
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

import WebMap from '@arcgis/core/WebMap';
import Map from '@arcgis/core/Map';
import WebScene from '@arcgis/core/WebScene';
import SceneView from '@arcgis/core/views/SceneView';

export const MapPage = (): JSX.Element => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      const map = new Map({
        basemap: 'arcgis-topographic',
        ground: 'world-elevation',
      });

      const scene = new SceneView({
        container: ref.current,
        map: map,
        camera: {
          position: {
            x: -118.808, //Longitude
            y: 33.961, //Latitude
            z: 2000, //Meters
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
