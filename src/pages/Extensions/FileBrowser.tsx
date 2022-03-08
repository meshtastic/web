import type React from 'react';

import { AnimatePresence, m } from 'framer-motion';
import { FiFilePlus } from 'react-icons/fi';
import useSWR from 'swr';

import { Button } from '@components/generic/button/Button';
import { Card } from '@components/generic/Card';
import { fetcher } from '@core/utils/fetcher';
import { useAppSelector } from '@hooks/useAppSelector';

export interface File {
  nameModified: string;
  name: string;
  size: number;
}

export interface Files {
  data: {
    files: File[];
    fileSystem: {
      total: number;
      used: number;
      free: number;
    };
  };
  status: string;
}

export const FileBrowser = (): JSX.Element => {
  const connectionParams = useAppSelector(
    (state) => state.app.connectionParams,
  );
  const appState = useAppSelector((state) => state.app);
  const meshtasticState = useAppSelector((state) => state.meshtastic);

  const { data } = useSWR<Files>(
    `${connectionParams.HTTP.tls ? 'https' : 'http'}://${
      connectionParams.HTTP.address
    }${
      meshtasticState.radio.hardware.firmwareVersion.includes('1.2')
        ? '/json/spiffs/browse/static'
        : '/json/fs/browse/static'
    }`,
    fetcher,
  );

  return (
    <div className="flex h-full p-4">
      <Card
        title="File Browser"
        actions={<Button icon={<FiFilePlus />}>Upload File</Button>}
        className="flex-grow flex-col"
      >
        <div className="h-full px-4">
          <AnimatePresence>
            {(!data || data?.data.files.length === 0) && (
              <div className="flex h-full w-full">
                <m.img
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="m-auto h-64 w-64 text-green-500"
                  src={appState.darkMode ? '/Files_Dark.svg' : '/Files.svg'}
                />
              </div>
            )}
          </AnimatePresence>
          {data?.data.files.map((file) => (
            <div
              key={file.name}
              className="flex h-10 w-full border-b border-gray-400 px-4 font-medium dark:border-gray-600 dark:text-white"
            >
              <div className="my-auto  w-1/3">
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`${connectionParams.HTTP.tls ? 'https' : 'http'}://${
                    connectionParams.HTTP.address
                  }/${file.name.replace('static/', '')}`}
                >
                  {file.name.replace('static/', '').replace('.gz', '')}
                </a>
              </div>
              <div className="my-auto  w-1/3"></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
