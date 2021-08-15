import React from 'react';

import { useAppDispatch, useAppSelector } from '@app/hooks/redux';
import { Button } from '@components/generic/Button';
import { setDarkModeEnabled } from '@core/slices/appSlice';
import { MoonIcon, SunIcon } from '@heroicons/react/outline';

export const ThemeToggle = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const darkMode = useAppSelector((state) => state.app.darkMode);

  return (
    <Button
      icon={
        darkMode ? (
          <SunIcon className="w-5 h-5" />
        ) : (
          <MoonIcon className="w-5 h-5" />
        )
      }
      circle
      onClick={(): void => {
        dispatch(setDarkModeEnabled(!darkMode));
      }}
    />
  );
};
