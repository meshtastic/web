import React from 'react';

import { FiMoon, FiSun } from 'react-icons/fi';

import { useAppDispatch, useAppSelector } from '@app/hooks/redux';
import { Button } from '@components/generic/Button';
import { setDarkModeEnabled } from '@core/slices/appSlice';

export const ThemeToggle = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const darkMode = useAppSelector((state) => state.app.darkMode);

  return (
    <Button
      icon={
        darkMode ? (
          <FiSun className="w-5 h-5" />
        ) : (
          <FiMoon className="w-5 h-5" />
        )
      }
      circle
      onClick={(): void => {
        dispatch(setDarkModeEnabled(!darkMode));
      }}
    />
  );
};
