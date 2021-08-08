import React from 'react';

type DefaultSelectProps = JSX.IntrinsicElements['select'];

export interface SelectProps {
  options: {
    value: string;
    label: string;
  }[];
  label: string;
}

export const Select = React.forwardRef<
  HTMLSelectElement,
  SelectProps & DefaultSelectProps
>(function Select(
  { options, label, id, ...props }: SelectProps & DefaultSelectProps,
  ref,
) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium dark:text-white">
        {label}
      </label>
      <select
        ref={ref}
        {...props}
        className="block w-full p-2 border dark:border-gray-600 rounded-md shadow-sm dark:bg-secondaryDark"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
});
