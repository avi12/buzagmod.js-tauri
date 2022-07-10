import { path } from "@tauri-apps/api";
import {
  BaseDirectory,
  createDir,
  readBinaryFile,
  readTextFile,
  removeFile,
  writeBinaryFile,
  writeTextFile
} from "@tauri-apps/api/fs";
import { dirname } from "@tauri-apps/api/path";
import { exists } from "tauri-plugin-fs-extra-api";
import { getIconDataUrl, Paths } from "./shared";
import type { ModMetadata, Mods, ModsLoaded } from "./global.interfaces";
import { PathModsFile } from "./global.interfaces";
import type { Unzipped } from "fflate";

async function getPath(pathRelative: string): Promise<string> {
  return path.join(await path.appDir(), pathRelative);
}

async function createDirIfNeeded(dirToCheck: string): Promise<void> {
  if (!(await exists(dirToCheck))) {
    await createDir(dirToCheck, { recursive: true });
  }
}

async function deleteIfExists(filename): Promise<void> {
  if (await exists(filename)) {
    await removeFile(filename);
  }
}

async function createOrUpdateJson(
  filenameRelative: typeof PathModsFile[keyof typeof PathModsFile],
  data: string
): Promise<void> {
  await createDirIfNeeded(await getPath(await dirname(filenameRelative)));
  const pathToCheck = await getPath(filenameRelative);
  if (await exists(pathToCheck)) {
    await removeFile(pathToCheck, { dir: BaseDirectory.App });
  }
  await writeTextFile(filenameRelative, data, { dir: BaseDirectory.App });
}

async function getModsJson(type: typeof PathModsFile[keyof typeof PathModsFile]): Promise<ModsLoaded> {
  const pathAbsolute = await getPath(type);
  return exists(pathAbsolute)
    .then(isExists => (isExists ? readTextFile(pathAbsolute) : "{}"))
    .then(text => JSON.parse(text))
    .catch(() => ({}));
}

async function getIcon({ uuid }: { uuid: string }): Promise<string> {
  const pathIcon = await getPath(`${Paths.icon}/${uuid}.jpg`);
  const iconData = (await exists(pathIcon)) ? await readBinaryFile(pathIcon) : new Uint8Array(0);
  return getIconDataUrl(iconData);
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
        metadata: jsonModsEnabled[uuid]
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
    const files: string[] = [];

    // Create all the files
    for (const pathCurrent in fileEntries) {
      const data = fileEntries[pathCurrent];
      const pathFull = await getPath(pathCurrent);
      await createDir(await path.dirname(pathCurrent), { recursive: true, dir: BaseDirectory.App });
      await writeBinaryFile(pathFull, data);
      files.push(pathCurrent.replace(Paths.content, ""));
    }

    // Add as entry to data.mods
    const modsFileContent = await getModsJson(PathModsFile.enabled);
    const modsJson = {
      ...modsFileContent,
      [uuid]: { ...metadata, files }
    };
    await createOrUpdateJson(PathModsFile.enabled, JSON.stringify(modsJson));
    return true;
  },
  async deleteMod(uuid): Promise<boolean> {
    // Fetch mod files list by UUID
    const jsonModsEnabled = await getModsJson(PathModsFile.enabled);
    const jsonModsDisabled = await getModsJson(PathModsFile.disabled);

    const deleteFiles = async (jsonMods: ModsLoaded): Promise<void> => {
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

    await deleteIfExists(await getPath(`icons/${uuid}.jpg`));

    await deleteFiles(jsonModsEnabled);
    delete jsonModsEnabled[uuid];
    await createOrUpdateJson(PathModsFile.enabled, JSON.stringify(jsonModsEnabled));

    return true;
  },
  async enableMod(uuid): Promise<boolean> {
    const jsonModsEnabled = await getModsJson(PathModsFile.enabled);
    const jsonModsDisabled = await getModsJson(PathModsFile.disabled);
    jsonModsEnabled[uuid] = { ...jsonModsDisabled[uuid] };
    delete jsonModsDisabled[uuid];
    await createOrUpdateJson(PathModsFile.enabled, JSON.stringify(jsonModsEnabled));
    await createOrUpdateJson(PathModsFile.disabled, JSON.stringify(jsonModsDisabled));
    return true;
  },
  async disableMod(uuid): Promise<boolean> {
    const jsonModsEnabled = await getModsJson(PathModsFile.enabled);
    const jsonModsDisabled = await getModsJson(PathModsFile.disabled);
    jsonModsDisabled[uuid] = { ...jsonModsEnabled[uuid] };
    delete jsonModsEnabled[uuid];
    await createOrUpdateJson(PathModsFile.enabled, JSON.stringify(jsonModsEnabled));
    await createOrUpdateJson(PathModsFile.disabled, JSON.stringify(jsonModsDisabled));
    return true;
  }
};
