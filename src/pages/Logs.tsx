import type React from "react";
import { useEffect, useState } from "react";

import { Mono } from "@app/components/generic/Mono.js";
import { useDevice } from "@core/providers/useDevice.js";
import { Protobuf, Types } from "@meshtastic/meshtasticjs";

export const LogsPage = (): JSX.Element => {
  const { connection } = useDevice();
  const [logs, setLogs] = useState<Types.LogEvent[]>([]);

  useEffect(() => {
    connection?.events.onLogEvent.subscribe((log) => {
      setLogs([...logs, log]);
    });
  }, [connection, setLogs, logs]);

  return (
    <div className="w-full overflow-y-auto">
      <div className="ring-black overflow-hidden ring-1 ring-opacity-5">
        <table className="divide-gray-300 min-w-full divide-y">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="text-gray-900 py-3.5 pr-3 pl-6 text-left text-sm font-semibold"
              >
                Emitter
              </th>
              <th
                scope="col"
                className="text-gray-900 py-3.5 text-left text-sm font-semibold"
              >
                Level
              </th>
              <th
                scope="col"
                className="text-gray-900 py-3.5 text-left text-sm font-semibold"
              >
                Message
              </th>
              <th
                scope="col"
                className="text-gray-900 py-3.5 text-left text-sm font-semibold"
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
                <td className="text-gray-500 whitespace-nowrap py-2 pl-6 text-sm">
                  <span className="my-auto">{Types.Emitter[log.emitter]}</span>
                </td>
                <td className="text-gray-500 whitespace-nowrap py-2 text-sm">
                  <span className="bg-slate-200 rounded-md p-1">
                    <Mono>{[Protobuf.LogRecord_Level[log.level]]}</Mono>
                  </span>
                </td>
                <td className="text-gray-500 whitespace-nowrap py-2 text-sm">
                  <Mono>{log.message}</Mono>
                </td>
                <td className="text-gray-500 whitespace-nowrap py-2 text-sm">
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
