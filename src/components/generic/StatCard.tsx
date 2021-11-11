import React from 'react';

export interface StatCardProps {
  title: string;
  value: string | JSX.Element;
}

export const StatCard = ({ title, value }: StatCardProps): JSX.Element => {
  return (
    <div className="w-full border-gray-300 shadow-md border-y md:border h-28 md:rounded-3xl dark:bg-primaryDark dark:border-transparent ">
      <div className="m-4">
        <div className="text-lg font-light">{title}</div>
        <div className="text-3xl font-bold">{value}</div>
      </div>
    </div>
  );
};
