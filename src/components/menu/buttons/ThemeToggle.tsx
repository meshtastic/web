import type React from 'react';

import { FiMoon, FiSun } from 'react-icons/fi';

import { useAppDispatch, useAppSelector } from '@app/hooks/redux';
import { setDarkModeEnabled } from '@core/slices/appSlice';
import { IconButton } from '@meshtastic/components';

export const ThemeToggle = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const darkMode = useAppSelector((state) => state.app.darkMode);

  return (
    <IconButton
      icon={
        darkMode ? (
          <FiSun className="w-5 h-5" />
        ) : (
          <FiMoon className="w-5 h-5" />
        )
      }
      onClick={(): void => {
        dispatch(setDarkModeEnabled(!darkMode));
      }}
    />
  );
};
