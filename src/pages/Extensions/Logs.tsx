import React from 'react';

import { useAppSelector } from '@app/hooks/useAppSelector';
import { Protobuf } from '@meshtastic/meshtasticjs';

export const Logs = (): JSX.Element => {
  const logs = useAppSelector((state) => state.meshtastic.logs);

  const logColor = (level: Protobuf.LogRecord_Level): string => {
    switch (level) {
      case Protobuf.LogRecord_Level.UNSET:
        return 'text-blue-500';
      case Protobuf.LogRecord_Level.CRITICAL:
        return 'text-blue-500';
      case Protobuf.LogRecord_Level.ERROR:
        return 'text-blue-500';
      case Protobuf.LogRecord_Level.WARNING:
        return 'text-blue-500';
      case Protobuf.LogRecord_Level.INFO:
        return 'text-blue-500';
      case Protobuf.LogRecord_Level.DEBUG:
        return 'text-blue-500';
      case Protobuf.LogRecord_Level.TRACE:
        return 'text-blue-500';
    }
  };

  const stringToColour = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let colour = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xff;
      colour += ('00' + value.toString(16)).substr(-2);
    }
    return colour;
  };

  return (
    <div className="flex h-full w-full select-none flex-col gap-4 p-4">
      <div className="flex w-full select-none flex-col gap-2 overflow-y-auto rounded-md p-4 shadow-md dark:bg-primaryDark">
        {logs.map((log, index) => (
          <div key={index} className="flex gap-2">
            <div className="text-sm font-light dark:text-gray-400">
              {log.date.toISOString()}
            </div>
            <div>[{log.emitter}]</div>
            <div className={`text-sm font-medium ${logColor(log.level)}`}>
              [{Protobuf.LogRecord_Level[log.level]}]
            </div>
            <div style={{ color: stringToColour(log.emitter) }}>
              {stringToColour(log.emitter)}
            </div>
            <div>{log.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
