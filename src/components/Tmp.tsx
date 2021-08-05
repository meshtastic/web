import React from 'react';

import { HomeIcon, MenuIcon } from '@heroicons/react/outline';

export const Tmp = () => {
  return (
    <div className="h-screen flex flex-col flex-auto items-center w-full min-w-0 bg-gray-200 ">
      <div className="relative flex justify-center w-full overflow-hidden z-50 bg-primary">
        <div className="max-w-360 w-full sm:py-3 sm:m-8 sm:mb-0 md:mt-12 md:mx-8 md:pt-4 md:pb-3 sm:rounded-t-xl border-b sm:shadow-2xl overflow-hidden bg-white">
          <div className="relative flex flex-auto flex-0 items-center h-16 px-4 md:px-6">
            {/* NORMAL NAV ICON */}
            <div className="hidden md:flex items-center mx-2">
              <img
                className="w-16 dark:hidden"
                src="Mesh_Logo_Black.svg"
                alt="Logo image"
              />
              <img
                className="hidden dark:flexw-16"
                src="Mesh_Logo_White.svg"
                alt="Logo image"
              />
            </div>
            {/* END NORMAL NAV ICON */}
            {/* MOBILE NAV BUTTON */}
            <button className="md:hidden w-10 h-10 rounded-full hover:bg-gray-200 hover:shadow-inner text-gray-500">
              <span className="flex justify-center ">
                <MenuIcon className="h-6 w-6" />
              </span>
            </button>
            {/* END MOBILE NAV BUTTON */}
            <div className="flex items-center pl-2 ml-auto space-x-1 sm:space-x-2">
              {/* HEADER BUTTON */}
              <button className="w-10 h-10 rounded-full hover:bg-gray-200 hover:shadow-inner">
                <span className="flex justify-center ">
                  <span className="w-6 shadow rounded-sm">
                    <img
                      className="w-full"
                      src="assets/images/flags/US.svg"
                      alt="Flag image for en"
                    />
                  </span>
                </span>
              </button>
              {/* END HEADER BUTTON */}
            </div>
          </div>
          <div className="hidden md:flex flex-auto flex-0 relative items-center h-16 px-4 ">
            <div className="flex items-center">
              {/* NAV ITEM */}
              <div className="flex h-12 items-center hover:bg-gray-100 rounded-md cursor-pointer px-3 select-none">
                <HomeIcon className="h-5 w-5 mr-3" />
                <span>Dashboard</span>
              </div>
              {/* END NAV ITEM */}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-auto justify-center w-full sm:px-8 sm:mb-8">
        <div className="flex flex-col flex-auto w-full sm:max-w-360 sm:shadow-xl sm:overflow-hidden bg-gray-100 sm:rounded-b-xl">
          <div className="flex flex-col flex-auto min-w-0 ">
            <div className="flex flex-col sm:flex-row flex-0 sm:items-center sm:justify-between p-6 sm:py-8 sm:px-10 border-b  bg-white">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center font-medium">
                  <div>
                    <a className="whitespace-nowrap text-purple-500">
                      User Interface
                    </a>
                  </div>
                </div>
                <div className="mt-2">
                  <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-7 sm:leading-10 truncate">
                    {' '}
                    Confirmation Dialog{' '}
                  </h2>
                </div>
              </div>
            </div>
            <div className="flex-auto p-6 sm:p-10 ">
              <div className="max-w-3xl">
                <div className="max-w-3xl prose prose-sm">
                  <p>
                    {' '}
                    One of the repetitive and tedious jobs in Angular is to
                    create confirmation dialogs. Since dialogs require their own
                    component you have to either create a separate component
                    every time you need a confirmation dialog or you have to
                    create your own confirmation dialog system that can be
                    configured.{' '}
                  </p>
                  <p>
                    {' '}
                    In order for you to save time while developing with Fuse, we
                    have created a simple yet powerful{' '}
                    <code>FuseConfirmationService</code> to create customized
                    confirmation dialogs on-the-fly.{' '}
                  </p>
                  <p>
                    {' '}
                    Below you can configure and preview the confirmation dialog.
                    You can use the generated configuration object within your
                    code to have the exact same dialog.{' '}
                  </p>
                  <p>
                    {' '}
                    For more detailed information and API documentation, check
                    the{' '}
                    <a href="/ui/fuse-components/services/confirmation">
                      documentation
                    </a>{' '}
                    page.{' '}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
