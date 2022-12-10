import type React from "react";
import { useEffect, useState } from "react";

import { Mono } from "@app/components/generic/Mono.js";
import { useDevice } from "@core/providers/useDevice.js";
import { Protobuf, Types } from "@meshtastic/meshtasticjs";

export const LogsPage = (): JSX.Element => {
  const { connection } = useDevice();
  const [logs, setLogs] = useState<Types.LogEvent[]>([]);

  useEffect(() => {
    connection?.onLogEvent.subscribe((log) => {
      setLogs([...logs, log]);
    });
  }, [connection, setLogs, logs]);

  return (
    <div className="w-full overflow-y-auto">
      <div className="overflow-hidden ring-1 ring-black ring-opacity-5">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="py-3.5 pr-3 pl-6 text-left text-sm font-semibold text-gray-900"
              >
                Emitter
              </th>
              <th
                scope="col"
                className="py-3.5 text-left text-sm font-semibold text-gray-900"
              >
                Level
              </th>
              <th
                scope="col"
                className="py-3.5 text-left text-sm font-semibold text-gray-900"
              >
                Message
              </th>
              <th
                scope="col"
                className="py-3.5 text-left text-sm font-semibold text-gray-900"
              >
                Scope
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {logs.map((log, index) => (
              <tr
                key={index}
                className={index % 2 === 0 ? undefined : "bg-gray-50"}
              >
                <td className="whitespace-nowrap py-2 pl-6 text-sm text-gray-500">
                  <span className="my-auto">{Types.Emitter[log.emitter]}</span>
                </td>
                <td className="whitespace-nowrap py-2 text-sm text-gray-500">
                  <span className="rounded-md bg-slate-200 p-1">
                    <Mono>{[Protobuf.LogRecord_Level[log.level]]}</Mono>
                  </span>
                </td>
                <td className="whitespace-nowrap py-2 text-sm text-gray-500">
                  <Mono>{log.message}</Mono>
                </td>
                <td className="whitespace-nowrap py-2 text-sm text-gray-500">
                  {Types.EmitterScope[log.scope]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
