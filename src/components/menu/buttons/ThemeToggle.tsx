import React from 'react';

import { MoonIcon, SunIcon } from '@heroicons/react/outline';

import { useAppDispatch, useAppSelector } from '../../../hooks/redux';
import { setDarkModeEnabled } from '../../../slices/appSlice';
import { Button } from '../../generic/Button';

export const ThemeToggle = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const darkMode = useAppSelector((state) => state.app.darkMode);

  return (
    <Button
      clickAction={() => {
        dispatch(setDarkModeEnabled(!darkMode));
      }}
    >
      {darkMode ? (
        <SunIcon className="h-6 w-6" />
      ) : (
        <MoonIcon className="h-6 w-6" />
      )}
    </Button>
  );
};
