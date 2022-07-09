import type { Unzipped } from "fflate";
import {
  BaseDirectory,
  createDir,
  readBinaryFile,
  readDir,
  readTextFile,
  removeFile,
  writeBinaryFile,
  writeTextFile
} from "@tauri-apps/api/fs";
import { path } from "@tauri-apps/api";
import { getIconDataUrl, Paths } from "./shared";

export type Mods = { [uuid: string]: ModSingle };

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

enum PathModsFile {
  enabled = "data\\data.json",
  disabled = "data\\disabled-mods.json"
}

async function getPath(pathRelative: string): Promise<string> {
  return path.join(await path.appDir(), pathRelative);
}

async function exists(filename: string): Promise<boolean> {
  const dir = await path.appDir();
  const files = await readDir(dir);
  return files.includes({ name: filename, path: dir });
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function getModsJson(type: PathModsFile) {
  const pathAbsolute = await getPath(type);
  return exists(pathAbsolute)
    .then(isExists => (isExists ? readTextFile(pathAbsolute) : "{}"))
    .then(text => JSON.parse(text))
    .catch(() => ({}));
}

async function getIcon({ uuid }: { uuid: string }): Promise<string> {
  const pathIcon = await getPath(`${Paths.icon}/${uuid}.jpg`);
  const iconData = (await readBinaryFile(pathIcon)) ?? new Buffer(0);
  return getIconDataUrl(Buffer.from(iconData));
}

export const Api = {
  async loadMods(): Promise<{ modsEnabled: Mods; modsDisabled: Mods }> {
    const jsonModsEnabled = await getModsJson(PathModsFile.enabled);
    const jsonModsDisabled = await getModsJson(PathModsFile.disabled);
    const modsEnabled: Mods = {};
    const modsDisabled: Mods = {};

    for (const uuid in jsonModsEnabled) {
      modsEnabled[uuid] = {
        icon: await getIcon({ uuid }),
        metadata: jsonModsEnabled[uuid] as ModMetadata
      };
    }

    for (const uuid in jsonModsDisabled) {
      modsDisabled[uuid] = {
        icon: await getIcon({ uuid }),
        metadata: jsonModsDisabled[uuid] as ModMetadata
      };
    }
    return { modsEnabled, modsDisabled };
  },

  async addMod({
    fileEntries,
    uuid,
    metadata
  }: {
    fileEntries: Unzipped;
    uuid: string;
    metadata: Omit<ModMetadata, "icon" | "md5" | "files">;
  }): Promise<boolean | string> {
    const filenames: string[] = [];

    // Create all the files
    for (const pathCurrent in fileEntries) {
      const data = fileEntries[pathCurrent];
      const pathFull = await getPath(pathCurrent);
      await createDir(await path.dirname(pathCurrent), { recursive: true, dir: BaseDirectory.App });
      await writeBinaryFile(pathFull, data);
      filenames.push(pathCurrent.replace(Paths.content, ""));
    }

    // Add as entry to data.mods
    const modsFileContent = await getModsJson(PathModsFile.enabled);
    const modsJson = {
      ...modsFileContent,
      [uuid]: {
        ...metadata,
        files: filenames
      }
    };
    await writeTextFile(PathModsFile.enabled, JSON.stringify(modsJson), { dir: BaseDirectory.App });
    return true;
  },

  async deleteMod(uuid): Promise<boolean> {
    // Fetch mod files list by UUID
    const jsonModsEnabled = await getModsJson(PathModsFile.enabled);
    const jsonModsDisabled = await getModsJson(PathModsFile.disabled);

    const deleteFiles = async (jsonMods: Mods): Promise<void> => {
      // Delete mod files
      // @ts-ignore
      for (const file of jsonMods[uuid].files) {
        await removeFile(await path.join(await path.appDir(), Paths.content, file));
      }
    };

    if (jsonModsDisabled[uuid]) {
      await deleteFiles(jsonModsDisabled);
      delete jsonModsDisabled[uuid];
      await writeTextFile(await getPath(PathModsFile.disabled), JSON.stringify(jsonModsDisabled));
      return true;
    }

    await removeFile(await getPath(`icons/${uuid}.jpg`));

    await deleteFiles(jsonModsEnabled);
    delete jsonModsEnabled[uuid];
    await writeTextFile(await getPath(PathModsFile.enabled), JSON.stringify(jsonModsEnabled));

    return true;
  },

  async enableMod(uuid): Promise<boolean> {
    const jsonModsEnabled = await getModsJson(PathModsFile.enabled);
    const jsonModsDisabled = await getModsJson(PathModsFile.disabled);
    jsonModsEnabled[uuid] = { ...jsonModsDisabled[uuid] };
    delete jsonModsDisabled[uuid];
    await writeTextFile(await getPath(PathModsFile.enabled), jsonModsEnabled);
    await writeTextFile(await getPath(PathModsFile.disabled), jsonModsDisabled);
    return true;
  },
  async disableMod(uuid): Promise<boolean> {
    const jsonModsEnabled = await getModsJson(PathModsFile.enabled);
    const jsonModsDisabled = await getModsJson(PathModsFile.disabled);
    jsonModsDisabled[uuid] = { ...jsonModsEnabled[uuid] };
    delete jsonModsEnabled[uuid];
    await writeTextFile(await getPath(PathModsFile.enabled), jsonModsEnabled);
    await writeTextFile(await getPath(PathModsFile.disabled), jsonModsDisabled);
    return true;
  }
};
