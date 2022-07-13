import { get, writable } from "svelte/store";
import { blobToDataUrl } from "@maruware/blob-to-base64";
import { deleteModFromFs } from "./fs";
import type { Mods } from "./global.interfaces";

export const modsOn = writable<Mods>({});
export const modsOff = writable<Mods>({});
export const errorMessage = writable("");
export const modCollisions = writable<Set<string>>(new Set());
export const filesInUse = writable<{ [filename: string]: string }>({});

export async function getIconDataUrl(data: Uint8Array): Promise<string> {
  return blobToDataUrl(new Blob([data]));
}

export function getIconPath(uuid: string): string {
  return `${Paths.icon}/${uuid}.jpg`;
}

export function getModFilesToUuids(): { [filename: string]: string } {
  const files: { [filename: string]: string } = {};
  const loadedMods = get(modsOn);
  for (const uuid in loadedMods) {
    for (const filename of loadedMods[uuid].metadata.files) {
      files[filename] = uuid;
    }
  }
  return files;
}

export async function deleteMod(uuid: string): Promise<void> {
  await deleteModFromFs(uuid);
  filesInUse.update(files => {
    for (const filename in files) {
      if (files[filename] === uuid) {
        delete files[filename];
      }
    }
    return files;
  });
  modsOn.update(mods => {
    delete mods[uuid];
    return mods;
  });
  modsOff.update(mods => {
    delete mods[uuid];
    return mods;
  });
  modCollisions.update(collisions => {
    collisions.delete(uuid);
    return collisions;
  });
}

export enum Paths {
  content = "content/",
  icon = "icons"
}

const regexAudio = /audio\/.+\.ogg/;
const regexImage = /img\/.+\.png/;
const regexStrings = /strings\/.+\.json/;
const regexIcon = new RegExp(`${Paths.icon}/`);
export const regexSupportedFiles = new RegExp(
  `(?:^${Paths.content}(?:${regexAudio.source}|${regexImage.source}|${regexStrings.source})$)|^${regexIcon.source}`
);

export const UUID_FIXED = "b38ae2e0-c30d-410b-89ab-9d087a602c14";
