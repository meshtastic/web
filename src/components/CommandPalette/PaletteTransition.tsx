import { Fragment, ReactNode } from "react";
import { Transition } from "@headlessui/react";

export interface PaletteTransitionProps {
  children: ReactNode;
}

export const PaletteTransition = ({
  children
}: PaletteTransitionProps): JSX.Element => {
  return (
    <>
      <Transition.Child
        as={Fragment}
        enter="ease-out duration-200"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-100"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="bg-gray-500 fixed inset-0 bg-opacity-25 transition-opacity" />
      </Transition.Child>

      <div className="fixed inset-0 z-10 overflow-y-auto p-4 sm:p-6 md:p-20">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="ease-in duration-100"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          {children}
        </Transition.Child>
      </div>
    </>
  );
};
