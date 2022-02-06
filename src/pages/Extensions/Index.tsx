import React from 'react';

import { FiFile, FiInfo } from 'react-icons/fi';
import { RiPinDistanceFill } from 'react-icons/ri';
import { VscExtensions } from 'react-icons/vsc';

import { Layout } from '@app/components/layout';
import { ExternalSection } from '@app/components/layout/Sidebar/sections/ExternalSection';

import { FileBrowser } from './FileBrowser';
import { Info } from './Info';

export const Extensions = (): JSX.Element => {
  const [selectedExtension, setSelectedExtension] = React.useState<
    'info' | 'fileBrowser' | 'rangeTest'
  >('info');

  return (
    <Layout
      title="Extensions"
      icon={<VscExtensions />}
      sidebarContents={
        <div className="absolute flex h-full w-full flex-col dark:bg-primaryDark">
          <ExternalSection
            onClick={(): void => {
              setSelectedExtension('info');
            }}
            icon={<FiInfo />}
            title="Node Info"
          />
          <ExternalSection
            onClick={(): void => {
              setSelectedExtension('fileBrowser');
            }}
            icon={<FiFile />}
            title="File Browser"
          />
          <ExternalSection
            onClick={(): void => {
              setSelectedExtension('rangeTest');
            }}
            icon={<RiPinDistanceFill />}
            title="Range Test"
          />
        </div>
      }
    >
      <div className="w-full">
        {selectedExtension === 'info' && <Info />}

        {selectedExtension === 'fileBrowser' && <FileBrowser />}
      </div>
    </Layout>
  );
};
