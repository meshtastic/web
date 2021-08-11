import React from 'react';

import { MoonIcon, SunIcon } from '@heroicons/react/outline';

import { setDarkModeEnabled } from '../../../core/slices/appSlice';
import { useAppDispatch, useAppSelector } from '../../../hooks/redux';
import { IconButton } from '../../generic/IconButton';

export const ThemeToggle = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const darkMode = useAppSelector((state) => state.app.darkMode);

  return (
    <IconButton
      onClick={() => {
        dispatch(setDarkModeEnabled(!darkMode));
      }}
    >
      {darkMode ? (
        <SunIcon className="h-6 w-6" />
      ) : (
        <MoonIcon className="h-6 w-6" />
      )}
    </IconButton>
  );
};
