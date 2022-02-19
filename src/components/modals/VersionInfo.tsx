import React from 'react';

import { AnimatePresence } from 'framer-motion';
import useSWR from 'swr';

import { setUpdateAvaliable } from '@app/core/slices/appSlice.js';
import { fetcher } from '@app/core/utils/fetcher.js';
import { useAppDispatch } from '@app/hooks/useAppDispatch.js';
import { Modal } from '@components/generic/Modal';

export interface Commit {
  sha: string;
  node_id: string;
  commit: {
    author: string;
    committer: string;
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
  visible: boolean;
  onClose: () => void;
}

export const VersionInfo = ({
  visible,
  onClose,
}: VersionInfoProps): JSX.Element => {
  const dispatch = useAppDispatch();

  const { data } = useSWR<Commit[]>(
    'https://api.github.com/repos/meshtastic/meshtastic-web/commits?per_page=10',
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  React.useEffect(() => {
    if (data) {
      const index = data.findIndex(
        (commit) => commit.sha.substring(0, 7) === process.env.COMMIT_HASH,
      );

      if (index === -1 || index > 0) {
        dispatch(setUpdateAvaliable(true));
      }
    }
  }, [data]);

  return (
    <AnimatePresence>
      {visible && (
        <Modal
          title="Version Info"
          onClose={(): void => {
            onClose();
          }}
        >
          <div className="flex flex-col gap-1 dark:text-white">
            {data &&
              data.map((commit) => (
                <div
                  key={commit.sha}
                  className={`flex gap-2 rounded-md p-1 ${
                    commit.sha.substring(0, 7) === process.env.COMMIT_HASH
                      ? 'bg-primary'
                      : 'dark:bg-secondaryDark'
                  }`}
                >
                  <div className="my-auto font-mono text-sm">
                    {commit.sha.substring(0, 7)}
                  </div>
                  <div className="truncate">{commit.commit.message}</div>
                </div>
              ))}
          </div>
        </Modal>
      )}
    </AnimatePresence>
  );
};
