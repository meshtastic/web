import React from 'react';

type DefaultInputProps = JSX.IntrinsicElements['input'];

export interface ToggleProps {
  label: string;
}

export const Toggle = React.forwardRef<
  HTMLInputElement,
  ToggleProps & DefaultInputProps
>(function Input(
  { label, id, checked, ...props }: ToggleProps & DefaultInputProps,
  ref,
) {
  return (
    <div className="flex flex-col">
      <span className="block text-sm font-medium dark:text-white">{label}</span>
      <div className="relative w-14 mr-2 ml-auto select-none">
        <input
          ref={ref}
          {...props}
          type="checkbox"
          className="peer checked:right-0 absolute w-7 h-7 rounded-full bg-white appearance-none cursor-pointer"
        />
        <label
          htmlFor={id}
          className="block overflow-hidden h-7 rounded-full peer-checked:bg-primary shadow-sm bg-gray-300 dark:bg-gray-700 cursor-pointer"
        ></label>
      </div>
    </div>
  );
});
