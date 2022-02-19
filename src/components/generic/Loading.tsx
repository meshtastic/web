import type React from 'react';

export const Loading = (): JSX.Element => {
  return (
    <div className="absolute top-0 bottom-0 left-0 right-0 z-10 flex rounded-md backdrop-blur-sm backdrop-filter">
      <div className="m-auto text-lg font-medium text-gray-400">Loading</div>
    </div>
  );
};
