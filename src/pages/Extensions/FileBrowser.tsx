import type React from "react";
import { useEffect, useState } from "react";

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
  const [data, setData] = useState<Files>();

  useEffect(() => {
    void fetch("http://meshtastic.local/json/fs/browse/static").then(
      async (res) => {
        setData((await res.json()) as Files);
      }
    );
  });

  return (
    <div>
      {data?.data.files.map((file) => (
        <div key={file.name}>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`http://meshtastic.local/${file.name.replace("static/", "")}`}
          >
            {file.name.replace("static/", "").replace(".gz", "")}
          </a>
        </div>
      ))}
    </div>
  );
};
