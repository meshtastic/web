import 'tippy.js/dist/tippy.css';

import type React from 'react';

import cuid from 'cuid';

import Tippy, { TippyProps } from '@tippyjs/react';

export const Tooltip = ({
  children,
  content,
  ...props
}: TippyProps): JSX.Element => {
  return (
    <Tippy content={content} {...props}>
      <div key={cuid()}>{children}</div>
    </Tippy>
  );
};
