import type React from 'react';

import { AnimatePresence, m } from 'framer-motion';
import { FiArrowRight, FiPaperclip } from 'react-icons/fi';

import { useAppSelector } from '@app/hooks/useAppSelector';
import { Protobuf, Types } from '@meshtastic/meshtasticjs';

export const Logs = (): JSX.Element => {
  const logs = useAppSelector((state) => state.meshtastic.logs);
  const darkMode = useAppSelector((state) => state.app.darkMode);

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
    <div className="flex h-full p-4">
      <table className="table-cell h-full w-full select-none rounded-md bg-white dark:bg-primaryDark">
        <tbody
          className="
          block h-full flex-col overflow-y-auto py-4 px-2 font-mono text-xs dark:text-gray-400"
        >
          <AnimatePresence>
            {logs.length === 0 && (
              <div className="flex h-full w-full">
                <m.img
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="m-auto h-64 w-64 text-green-500"
                  src={`/placeholders/${
                    darkMode ? 'View Code Dark.svg' : 'View Code.svg'
                  }`}
                />
              </div>
            )}
          </AnimatePresence>
          {logs.map((log, index) => (
            // <ContextMenu
            //   key={index}
            //   items={
            //     <>
            //       <ContextItem title="Test" icon={<FiGitBranch />} />
            //     </>
            //   }
            // >
            <tr
              key={index}
              className="group hover:bg-gray-200 dark:hover:bg-secondaryDark"
            >
              <m.td
                className="w-6 cursor-pointer"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="m-auto pl-2 text-white group-hover:text-black dark:text-primaryDark dark:group-hover:text-gray-400">
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
              <td
                className={`m-auto ${
                  log.packet ? '' : 'dark:text-secondaryDark'
                }`}
              >
                <FiPaperclip />
              </td>
              <td className="truncate pl-1">{log.message}</td>
            </tr>
            // </ContextMenu>
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
      className="-my-0.5 flex max-w-min cursor-pointer truncate rounded-sm px-0.5 hover:bg-gray-400 dark:hover:bg-gray-700"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {children}
    </m.div>
  </td>
);
