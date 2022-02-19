import React from 'react';

import { FiFile, FiInfo } from 'react-icons/fi';
import { MdSubject } from 'react-icons/md';
import { RiPinDistanceFill } from 'react-icons/ri';
import { VscExtensions } from 'react-icons/vsc';

import { ExternalSection } from '@components/generic/Sidebar/ExternalSection';
import { Layout } from '@components/layout';
import { FileBrowser } from '@pages/Extensions/FileBrowser';
import { Info } from '@pages/Extensions/Info';
import { Logs } from '@pages/Extensions/Logs';

export const Extensions = (): JSX.Element => {
  const [selectedExtension, setSelectedExtension] = React.useState<
    'info' | 'logs' | 'fileBrowser' | 'rangeTest'
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
              setSelectedExtension('logs');
            }}
            icon={<MdSubject />}
            title="Logs"
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

        {selectedExtension === 'logs' && <Logs />}

        {selectedExtension === 'fileBrowser' && <FileBrowser />}
      </div>
    </Layout>
  );
};
