import type React from 'react';

export interface StatCardProps {
  title: string;
  value: string | JSX.Element;
}

export const StatCard = ({ title, value }: StatCardProps): JSX.Element => {
  return (
    <div className="w-full bg-white border-gray-300 shadow-md select-none dark:text-white border-y md:border dark:bg-primaryDark dark:border-gray-600 md:rounded-md ">
      <div className="m-4">
        <div className="text-lg font-light">{title}</div>
        <div className="text-3xl font-bold">{value}</div>
      </div>
    </div>
  );
};
