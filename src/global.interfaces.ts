import type { Unzipped } from "fflate";

export type Mods = { [uuid: string]: ModSingle };
export type ModsLoaded = { [uuid: string]: ModMetadata };

export interface ModSingle {
  files?: Unzipped;
  metadata: ModMetadata;
  icon: string;
}

export interface ModMetadata {
  md5: string;
  name: string;
  author: string;
  description: string;
  files: string[];
}

const IS_DEV = location.hostname === "localhost";

export const PathModsFile = {
  enabled: `data/data.${IS_DEV ? "json" : "mods"}`,
  disabled: `data/disabled-mods.json`
} as const;
