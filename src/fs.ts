import { path } from "@tauri-apps/api";
import { BaseDirectory, createDir, readBinaryFile, readTextFile, removeFile, writeTextFile } from "@tauri-apps/api/fs";
import { dirname } from "@tauri-apps/api/path";
import { exists } from "tauri-plugin-fs-extra-api";
import { getIconDataUrl, Paths } from "./shared";
import { PathModsFile } from "./global.interfaces";
import type { ModsLoaded } from "./global.interfaces";

export async function getPath(pathRelative: string): Promise<string> {
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

export async function createOrUpdateJson(
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

export async function getModsJson(type: typeof PathModsFile[keyof typeof PathModsFile]): Promise<ModsLoaded> {
  const pathAbsolute = await getPath(type);
  return exists(pathAbsolute)
    .then(isExists => (isExists ? readTextFile(pathAbsolute) : "{}"))
    .then(text => JSON.parse(text))
    .catch(() => ({}));
}

export async function getIcon({ uuid }: { uuid: string }): Promise<string> {
  const pathIcon = await getPath(`${Paths.icon}/${uuid}.jpg`);
  const iconData = (await exists(pathIcon)) ? await readBinaryFile(pathIcon) : new Uint8Array(0);
  return getIconDataUrl(iconData);
}

export async function deleteModFromFs(uuid): Promise<void> {
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
    return;
  }

  await deleteIfExists(await getPath(`icons/${uuid}.jpg`));

  await deleteFiles(jsonModsEnabled);
  delete jsonModsEnabled[uuid];
  await createOrUpdateJson(PathModsFile.enabled, JSON.stringify(jsonModsEnabled));

  return;
}
