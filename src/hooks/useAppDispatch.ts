/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { useDispatch } from 'react-redux';

import type { AppDispatch } from '@core/store';

export const useAppDispatch = () => useDispatch<AppDispatch>();
