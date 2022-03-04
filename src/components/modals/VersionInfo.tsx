import type React from 'react';
import { useEffect } from 'react';

import { MdUpgrade } from 'react-icons/md';
import useSWR from 'swr';

import { IconButton } from '@components/generic/button/IconButton';
import { Modal } from '@components/generic/Modal';
import { connectionUrl } from '@core/connection';
import { setUpdateAvaliable } from '@core/slices/appSlice';
import { fetcher } from '@core/utils/fetcher';
import { useAppDispatch } from '@hooks/useAppDispatch';
import { useAppSelector } from '@hooks/useAppSelector';

export interface Commit {
  sha: string;
  node_id: string;
  commit: {
    author: string;
    committer: {
      date: string;
      email: string;
      mame: string;
    };
    message: string;
    tree: {
      sha: string;
      url: string;
    };
    url: string;
    comment_count: number;
  };
  url: string;
  html_url: string;
  comments_url: string;
}

export interface VersionInfoProps {
  modalOpen: boolean;
  onClose: () => void;
}

export const VersionInfo = ({
  modalOpen,
  onClose,
}: VersionInfoProps): JSX.Element => {
  const appState = useAppSelector((state) => state.app);
  const dispatch = useAppDispatch();

  const { data } = useSWR<Commit[]>(
    'https://api.github.com/repos/meshtastic/meshtastic-web/commits?per_page=100',
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  useEffect(() => {
    if (data) {
      const index = data.findIndex(
        (commit) => commit.sha.substring(0, 7) === process.env.COMMIT_HASH,
      );

      if (index === -1 || index > 0) {
        dispatch(setUpdateAvaliable(true));
      }
    }
  }, [data, dispatch]);

  return (
    <Modal
      open={modalOpen}
      title="Version Info"
      bgDismiss
      actions={
        // TODO: Check if version is hosted, and merge pwa update button here
        appState.updateAvaliable && (
          <a href={`http://${connectionUrl}/admin/spiffs`}>
            <IconButton tooltip="Update now" icon={<MdUpgrade />} />
          </a>
        )
      }
      onClose={(): void => {
        onClose();
      }}
    >
      <div className="flex h-96 flex-col gap-1 overflow-y-auto dark:text-white">
        {data &&
          data.map((commit) => (
            <div
              key={commit.sha}
              className={`flex gap-2 rounded-md border border-transparent py-1 px-2 hover:border-primary ${
                commit.sha.substring(0, 7) === process.env.COMMIT_HASH
                  ? 'bg-primary'
                  : 'dark:bg-secondaryDark'
              }`}
            >
              <div className="my-auto text-xs dark:text-gray-400">
                {new Date(commit.commit.committer.date).toLocaleDateString()}
              </div>
              <div className="my-auto font-mono text-sm">
                {commit.sha.substring(0, 7)}
              </div>
              <div className="truncate">{commit.commit.message}</div>
            </div>
          ))}
      </div>
    </Modal>
  );
};
