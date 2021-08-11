import React from 'react';

import { useForm } from 'react-hook-form';

import { XCircleIcon } from '@heroicons/react/outline';
import type { Protobuf } from '@meshtastic/meshtasticjs';

import { connection } from '../../core/connection';

export interface NodeProps {
  node: Protobuf.NodeInfo;
  onClose: () => void;
}

export const NodeDetails = ({ node }: NodeProps): JSX.Element => {
  const { register, handleSubmit } = useForm<Protobuf.User>({
    defaultValues: node.user,
  });

  const onSubmit = handleSubmit((data) => {
    console.log(data);
    connection.setOwner(data);
  });

  return (
    <div>
      <div className="flex dark:bg-primaryDark p-2 rounded-t-md justify-between border-b dark:border-gray-600 dark:text-white">
        <div>{node.user?.longName ?? node.num}</div>
        <XCircleIcon className="h-5 w-5 dark:text-white my-auto" />
      </div>
      <div>
        <form onSubmit={onSubmit}>
          {/* <Input label="Node Name" {...register('longName', {})} /> */}
          <button
            type="submit"
            className="w-full rounded-md dark:bg-primaryDark shadow-md border dark:border-gray-600 p-2 mt-6 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-900"
          >
            Save
          </button>
        </form>
      </div>
    </div>
  );
};
