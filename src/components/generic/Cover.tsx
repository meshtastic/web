import type React from 'react';

export interface CoverProps {
  content: JSX.Element;
  enabled: boolean;
}

export const Cover = ({ content, enabled }: CoverProps): JSX.Element => {
  return enabled ? <div className="m-4 ">{content}</div> : <></>;
};
