import React, { InputHTMLAttributes, useState } from "react";

import { ExclamationCircleIcon } from "@heroicons/react/24/outline";

export interface IPAddressProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
  prefix?: string;
  suffix?: string;
  action?: {
    icon: JSX.Element;
    action: () => void;
  };
  error?: string;
}

export const IPAddress = ({
  label,
  description,
  action,
  error,
  disabled,
  ...rest
}: IPAddressProps): JSX.Element => {
  const [value, setValue] = useState<[number, number, number, number]>([
    0, 0, 0, 0
  ]);

  // const getRange = (el) => {
  //     var cuRange, tbRange, headRange, range, dupRange, ret = {};
  //     if (el.setSelectionRange) {
  //       // standard
  //       ret.begin = el.selectionStart;
  //       ret.end = el.selectionEnd;
  //       ret.result = el.value.substring(ret.begin, ret.end);
  //     } else if (document.selection) {
  //       // ie
  //       if (el.tagName.toLowerCase() === 'input') {
  //         cuRange = document.selection.createRange();
  //         tbRange = el.createTextRange();
  //         tbRange.collapse(true);
  //         tbRange.select();
  //         headRange = document.selection.createRange();
  //         headRange.setEndPoint('EndToEnd', cuRange);
  //         ret.begin = headRange.text.length - cuRange.text.length;
  //         ret.end = headRange.text.length;
  //         ret.result = cuRange.text;
  //         cuRange.select();
  //       } else if (el.tagName.toLowerCase() === 'textarea') {
  //         range = document.selection.createRange();
  //         dupRange = range.duplicate();
  //         dupRange.moveToElementText(el);
  //         dupRange.setEndPoint('EndToEnd', range);
  //         ret.begin = dupRange.text.length - range.text.length;
  //         ret.end = dupRange.text.length;
  //         ret.result = range.text;
  //       }
  //     }
  //     el.focus();
  //     return ret;
  //   }

  //   const isValidIPItemValue = (val) => {
  //     val = parseInt(val);
  //     return !isNaN(val) && val >= 0 && val <= 255;
  //   }

  //   const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, index: number) => {
  //     /* 37 = ←, 39 = →, 8 = backspace, 110 or 190 = . */
  //     let domId = index;
  //     if ((event.keyCode === 37 || event.keyCode === 8) && getRange(event.target).end === 0 && index > 0) { domId = index - 1; }
  //     if (event.keyCode === 39 && getRange(event.target).end === event.target.value.length && index < 3) { domId = index + 1; }
  //     if (event.keyCode === 110 || event.keyCode === 190) {
  //         event.preventDefault();
  //       if(i < 3) {
  //         domId = i + 1;
  //       }
  //     }
  //     this[`_input-${domId}`].focus();
  //   }

  //   useEffect(() => {

  //   }, [])

  //   const ip = value.map(val => isNaN(val) ? '' : val).join('.');

  return (
    <div>
      {/* Label */}
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {/*  */}
      <div className="relative flex gap-1 rounded-md">
        {value.map((octet, index) => (
          <>
            <input
              key={index}
              //   ref={ref}
              className={`flex h-10 w-full rounded-md border-transparent bg-orange-100 px-3 text-sm shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                action ? "rounded-r-none" : ""
              } ${
                disabled
                  ? "cursor-not-allowed bg-orange-50 text-orange-200"
                  : ""
              }`}
              disabled={disabled}
              {...rest}
            />
            {index !== 3 && <i className="text-xl">.</i>}
          </>
        ))}
        {action && (
          <button
            type="button"
            onClick={action.action}
            className="relative -ml-px inline-flex items-center space-x-2 rounded-r-md bg-orange-200 px-4 py-2 text-sm font-medium hover:bg-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {action.icon}
          </button>
        )}
        {error && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
          </div>
        )}
      </div>
      {description && (
        <p className="mt-2 text-sm text-gray-500">{description}</p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
};
