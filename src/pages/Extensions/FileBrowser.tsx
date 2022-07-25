import type React from "react";

import { Pane } from "evergreen-ui";
import useSWR from "swr";

import { fetcher } from "@core/utils/fetcher";

export interface File {
  nameModified: string;
  name: string;
  size: number;
}

export interface Files {
  data: {
    files: File[];
    fileSystem: {
      total: number;
      used: number;
      free: number;
    };
  };
  status: string;
}

export const FileBrowser = (): JSX.Element => {
  const { data } = useSWR<Files>(
    "http://meshtastic.local/json/fs/browse/static",
    fetcher
  );

  return (
    <Pane>
      {data?.data.files.map((file) => (
        <Pane key={file.name}>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`http://meshtastic.local/json/fs/browse/static/${file.name.replace(
              "static/",
              ""
            )}`}
          >
            {file.name.replace("static/", "").replace(".gz", "")}
          </a>
        </Pane>
      ))}
    </Pane>
  );
};
