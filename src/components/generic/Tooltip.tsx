import 'tippy.js/dist/tippy.css';

import type React from 'react';

import Tippy, { TippyProps } from '@tippyjs/react';

export const Tooltip = ({
  children,
  content,
  ...props
}: TippyProps): JSX.Element => {
  return (
    <Tippy content={content} {...props}>
      <div>{children}</div>
    </Tippy>
  );
};
