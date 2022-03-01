import type React from 'react';

import { AnimatePresence, m } from 'framer-motion';
import { FiArrowRight, FiPaperclip, FiTrash } from 'react-icons/fi';

import { IconButton } from '@app/components/generic/button/IconButton';
import { Card } from '@app/components/generic/Card';
import { clearLogs } from '@app/core/slices/meshtasticSlice';
import { useAppDispatch } from '@app/hooks/useAppDispatch';
import { useAppSelector } from '@hooks/useAppSelector';
import { Protobuf, Types } from '@meshtastic/meshtasticjs';

export const Logs = (): JSX.Element => {
  const dispatch = useAppDispatch();

  const meshtasticState = useAppSelector((state) => state.meshtastic);
  const appState = useAppSelector((state) => state.app);

  type lookupType = { [key: number]: string };

  const emitterLookup: lookupType = {
    [Types.Emitter.sendText]: 'text-rose-500',
    [Types.Emitter.sendPacket]: 'text-pink-500',
    [Types.Emitter.sendRaw]: 'text-fuchsia-500',
    [Types.Emitter.setPreferences]: 'text-purple-500',
    [Types.Emitter.confirmSetPreferences]: 'text-violet-500',
    [Types.Emitter.setOwner]: 'text-indigo-500',
    [Types.Emitter.setChannel]: 'text-blue-500',
    [Types.Emitter.confirmSetChannel]: 'text-sky-500',
    [Types.Emitter.deleteChannel]: 'text-cyan-500',
    [Types.Emitter.getChannel]: 'text-teal-500',
    [Types.Emitter.getAllChannels]: 'text-emerald-500',
    [Types.Emitter.getPreferences]: 'text-green-500',
    [Types.Emitter.getOwner]: 'text-lime-500',
    [Types.Emitter.configure]: 'text-yellow-500',
    [Types.Emitter.handleFromRadio]: 'text-amber-500',
    [Types.Emitter.handleMeshPacket]: 'text-orange-500',
    [Types.Emitter.connect]: 'text-red-500',
    [Types.Emitter.ping]: 'text-stone-500',
    [Types.Emitter.readFromRadio]: 'text-zinc-500',
    [Types.Emitter.writeToRadio]: 'text-gray-500',
    [Types.Emitter.setDebugMode]: 'text-slate-500',
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
    <div className="flex h-full flex-col gap-4 p-4">
      <Card
        title="Device Logs"
        actions={
          <IconButton
            icon={<FiTrash />}
            onClick={(): void => {
              dispatch(clearLogs());
            }}
          />
        }
        className="flex-grow overflow-y-auto"
      >
        <table className="table-cell flex-grow">
          <tbody
            className="
          block h-full flex-col overflow-y-auto font-mono text-xs dark:text-gray-400"
          >
            <AnimatePresence>
              {meshtasticState.logs.length === 0 && (
                <div className="flex h-full w-full">
                  <m.img
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="m-auto h-64 w-64 text-green-500"
                    src={`/placeholders/${
                      appState.darkMode ? 'View Code Dark.svg' : 'View Code.svg'
                    }`}
                  />
                </div>
              )}

              {meshtasticState.logs.map((log, index) => (
                <m.tr
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="group hover:bg-gray-300 dark:hover:bg-secondaryDark"
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
                      [{Types.EmitterScope[log.scope]}.
                      {Types.Emitter[log.emitter]}]
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
                  <td className="w-full truncate pl-1">{log.message}</td>
                </m.tr>
                // </ContextMenu>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </Card>
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
