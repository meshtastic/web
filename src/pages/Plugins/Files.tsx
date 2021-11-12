import type React from 'react';

// import { DefaultExtensionType, defaultStyles, FileIcon } from 'react-file-icon';
import { FiMenu, FiTrash, FiUploadCloud } from 'react-icons/fi';
import useSWR from 'swr';

import fetcher from '@app/core/utils/fetcher';
import { useAppSelector } from '@app/hooks/redux';
import { Card } from '@components/generic/Card';
import { IconButton } from '@components/generic/IconButton';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';

export interface RangeTestProps {
  navOpen?: boolean;
  setNavOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}
interface IFile {
  name: string;
  nameModified: string;
  size: number;
}
interface IFiles {
  data: {
    files: IFile[];
    filesystem: {
      free: number;
      total: number;
      used: number;
    };
  };

  status: boolean;
}

export const Files = ({ navOpen, setNavOpen }: RangeTestProps): JSX.Element => {
  const hostOverrideEnabled = useAppSelector(
    (state) => state.meshtastic.hostOverrideEnabled,
  );
  const hostOverride = useAppSelector((state) => state.meshtastic.hostOverride);

  const connectionURL = hostOverrideEnabled
    ? hostOverride
    : import.meta.env.PROD
    ? window.location.hostname
    : (import.meta.env.VITE_PUBLIC_DEVICE_IP as string) ??
      'http://meshtastic.local';

  const { data } = useSWR<IFiles>(
    `http://${connectionURL}/json/spiffs/browse/static`,
    fetcher,
  );

  return (
    <PrimaryTemplate
      title="File Browser"
      tagline="Plugin"
      leftButton={
        <IconButton
          icon={<FiMenu className="w-5 h-5" />}
          onClick={(): void => {
            setNavOpen && setNavOpen(!navOpen);
          }}
        />
      }
    >
      <div className="flex flex-col justify-between w-full gap-4 md:flex-row-reverse">
        <Card title="SPIFFS" description="Statistics">
          {data ? (
            <div className="flex">
              <div className="mx-auto my-4 bg-gray-500 rounded-3xl">
                <div></div>
                {JSON.stringify(data.data.filesystem.used)} bytes total
              </div>
            </div>
          ) : (
            <div>Loading...</div>
          )}
        </Card>
        <Card
          title="Files"
          description="SPIFFS Contents"
          buttons={<IconButton icon={<FiUploadCloud className="w-8 h-8" />} />}
          className="md:w-1/3"
        >
          {data ? (
            <div className="flex flex-col my-4 space-y-2">
              {data.data.files.map((file: IFile) => (
                <div
                  key={file.name}
                  className="flex justify-between mx-4 bg-gray-300 rounded-md dark:bg-gray-600 "
                >
                  <div className="flex p-2 max-h-12">
                    <div className="flex w-12">
                      {/* <FileIcon
                        extension={
                          (file.nameModified ?? file.name).split('.')[
                            (file.nameModified ?? file.name).split('.').length -
                              1
                          ]
                        }
                        {...defaultStyles[
                          (file.nameModified ?? file.name).split('.')[
                            (file.nameModified ?? file.name).split('.').length -
                              1
                          ] as DefaultExtensionType
                        ]}
                      /> */}
                    </div>
                    <a
                      href={`http://${connectionURL}/${file.name.replace(
                        'static/',
                        '',
                      )}`}
                      className="my-auto font-semibold"
                    >
                      {file.nameModified ?? file.name}
                    </a>
                  </div>
                  <IconButton
                    className="mx-2 my-auto"
                    // confirmAction={async (): Promise<void> => {
                    //   await fetch(
                    //     `http://${connectionURL}/json/spiffs/delete/static?remove=${file.name}`,
                    //     {
                    //       method: 'DELETE',
                    //     },
                    //   );
                    // }}
                    icon={<FiTrash className="w-5 h-5" />}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div>Loading...</div>
          )}
        </Card>
      </div>
    </PrimaryTemplate>
  );
};
