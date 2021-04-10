import React from 'react';

interface TimelineItemProps {
  time: number;
  color: string;
}

const TimelineItem = (props: TimelineItemProps) => {
  return <div className={`rounded-full h-6 w-6 bg-${props.color}`}>Test</div>;
};

export default TimelineItem;
