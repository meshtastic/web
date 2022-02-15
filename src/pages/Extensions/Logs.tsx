import type React from 'react';

import { m } from 'framer-motion';
import { FiArrowRight } from 'react-icons/fi';

import { useAppSelector } from '@app/hooks/useAppSelector';
import { Protobuf, Types } from '@meshtastic/meshtasticjs';

export const Logs = (): JSX.Element => {
  const logs = useAppSelector((state) => state.meshtastic.logs);

  type lookupType = { [key: number]: string };

  const emitterLookup: lookupType = {
    [Types.Emitter.sendPacket]: 'text-blue-500',
    [Types.Emitter.sendText]: 'text-blue-500',
    [Types.Emitter.sendPacket]: 'text-blue-500',
    [Types.Emitter.sendRaw]: 'text-blue-500',
    [Types.Emitter.setPreferences]: 'text-blue-500',
    [Types.Emitter.confirmSetPreferences]: 'text-blue-500',
    [Types.Emitter.setOwner]: 'text-blue-500',
    [Types.Emitter.setChannel]: 'text-blue-500',
    [Types.Emitter.confirmSetChannel]: 'text-blue-500',
    [Types.Emitter.deleteChannel]: 'text-blue-500',
    [Types.Emitter.getChannel]: 'text-blue-500',
    [Types.Emitter.getAllChannels]: 'text-blue-500',
    [Types.Emitter.getPreferences]: 'text-blue-500',
    [Types.Emitter.getOwner]: 'text-blue-500',
    [Types.Emitter.configure]: 'text-blue-500',
    [Types.Emitter.handleFromRadio]: 'text-blue-500',
    [Types.Emitter.handleMeshPacket]: 'text-blue-500',
    [Types.Emitter.connect]: 'text-blue-500',
    [Types.Emitter.ping]: 'text-blue-500',
    [Types.Emitter.readFromRadio]: 'text-blue-500',
    [Types.Emitter.writeToRadio]: 'text-blue-500',
    [Types.Emitter.setDebugMode]: 'text-blue-500',
  };

  const levelLookup: lookupType = {
    [Protobuf.LogRecord_Level.UNSET]: 'text-green-500',
    [Protobuf.LogRecord_Level.CRITICAL]: 'text-purple-500',
    [Protobuf.LogRecord_Level.ERROR]: 'text-red-500',
    [Protobuf.LogRecord_Level.WARNING]: 'text-orange-500',
    [Protobuf.LogRecord_Level.INFO]: 'text-blue-500',
    [Protobuf.LogRecord_Level.DEBUG]: 'text-neutral-500',
    [Protobuf.LogRecord_Level.TRACE]: 'text-slate-500',
  };

  return (
    <div className="flex h-full p-4 ">
      <table className="table-cell h-full w-full select-none rounded-md dark:bg-primaryDark">
        {/* \/ flex flex-col gap-2 */}
        <tbody
          className="
          block h-full flex-col overflow-y-auto py-4 px-2 font-mono text-xs dark:text-gray-400"
        >
          {logs.map((log, index) => (
            <tr key={index} className="group hover:bg-secondaryDark">
              <m.td
                className="w-6 cursor-pointer"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="m-auto pl-2 dark:text-primaryDark dark:group-hover:text-gray-400">
                  <FiArrowRight />
                </div>
              </m.td>
              <Wrapper>
                {log.date
                  .toLocaleString(undefined, {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',

                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                  .replaceAll('/', '-')
                  .replace(',', '')}
              </Wrapper>
              <Wrapper>
                <div className={emitterLookup[log.emitter]}>
                  [{Types.EmitterScope[log.scope]}.{Types.Emitter[log.emitter]}]
                </div>
              </Wrapper>
              <Wrapper className={levelLookup[log.level]}>
                [{Protobuf.LogRecord_Level[log.level]}]{/* </div> */}
              </Wrapper>
              <td className="truncate pl-1">{log.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Wrapper = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}): JSX.Element => (
  <td className={className}>
    <m.div
      className="-my-0.5 flex max-w-min cursor-pointer truncate rounded-sm px-0.5 hover:bg-gray-700"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {children}
    </m.div>
  </td>
);
