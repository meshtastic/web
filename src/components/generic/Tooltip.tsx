import 'tippy.js/dist/tippy.css';

import type React from 'react';

import Tippy from '@tippyjs/react';

export interface TooltipProps {
  children: JSX.Element;
  contents: string;
}

export const Tooltip = ({ children, contents }: TooltipProps): JSX.Element => {
  return <Tippy content={contents}>{children}</Tippy>;
};
