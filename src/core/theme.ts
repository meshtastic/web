import type { Theme } from '@material-ui/core';
import { createTheme } from '@material-ui/core/styles';

export const theme = (darkMode: boolean): Theme => {
  return createTheme(
    darkMode
      ? {
          palette: {
            mode: 'dark',
            primary: {
              main: '#67ea94',
            },
            background: {
              default: '#0F172A',
              paper: '#0F172A',
            },
          },
        }
      : {
          palette: {
            mode: 'light',
            primary: {
              main: '#67ea94',
            },
          },
        },
  );
};
