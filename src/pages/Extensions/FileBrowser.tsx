import React from 'react';

import { AnimatePresence, m } from 'framer-motion';
import useSWR from 'swr';

import { Card } from '@app/components/generic/Card';
import fetcher from '@core/utils/fetcher';
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
  const darkMode = useAppSelector((state) => state.app.darkMode);

  const { data } = useSWR<Files>(
    `${connectionParams.HTTP.tls ? 'https' : 'http'}://${
      connectionParams.HTTP.address
    }/json/spiffs/browse/static`,
    fetcher,
  );

  return (
    <div className="flex h-full p-4">
      <Card className="flex-grow flex-col">
        <div className="flex h-10 w-full rounded-t-md border-b border-gray-300 px-4 text-lg font-semibold shadow-md dark:border-gray-600 dark:bg-zinc-700 dark:text-white">
          <div className="my-auto  w-1/3">FileName</div>
          <div className="my-auto  w-1/3">Actions</div>
        </div>
        <div className="h-full px-4">
          <AnimatePresence>
            {(!data || data?.data.files.length === 0) && (
              <div className="flex h-full w-full">
                <m.img
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="m-auto h-64 w-64 text-green-500"
                  src={`/placeholders/${
                    darkMode ? 'Files Dark.svg' : 'Files.svg'
                  }`}
                />
              </div>
            )}
          </AnimatePresence>
          {data?.data.files.map((file) => (
            <div
              key={file.name}
              className="flex h-10 w-full border-b border-gray-300 px-4 font-medium dark:border-gray-600 dark:text-white"
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
