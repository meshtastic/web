import React from 'react';

import { AnimatePresence } from 'framer-motion';

import { Modal } from '@components/generic/Modal';

import { Card } from '../generic/Card';

export interface VersionInfoProps {
  visible: boolean;
  onclose: () => void;
}

export const VersionInfo = ({
  visible,
  onclose,
}: VersionInfoProps): JSX.Element => {
  // const { data } = useSWR<CommitHistory>(
  //   `query {
  //     repository(owner: "meshtastic", name: "meshtastic-web") {
  //       ref(qualifiedName: "master") {
  //         name
  //         target {
  //           ... on Commit {
  //             history(first: 4) {
  //               edges {
  //                 node {
  //                   abbreviatedOid
  //                   message
  //                   author {
  //                     avatarUrl
  //                     name
  //                   }
  //                 }
  //               }
  //             }
  //           }
  //         }
  //       }
  //     }
  //   }`,
  //   fetcher,
  // );

  return (
    <AnimatePresence>
      {visible && (
        <Modal
          onClose={(): void => {
            onclose();
          }}
        >
          <Card className="relative">
            <div className="w-full max-w-3xl p-10">Version Info</div>
            {/* {data?.sha} */}
          </Card>
        </Modal>
      )}
    </AnimatePresence>
  );
};
