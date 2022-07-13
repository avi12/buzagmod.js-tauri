import { get } from "svelte/store";
import type { Unzipped } from "fflate";
import { filesInUse, modCollisions, Paths } from "../shared";

export function getMetadata({ zipObjRaw }: { zipObjRaw: Unzipped }): {
  name?: string;
  description?: string;
  author?: string;
} {
  const modMetadata = zipObjRaw["mod.txt"];
  if (!modMetadata) {
    return {};
  }
  return JSON.parse(new TextDecoder().decode(modMetadata));
}

function hasMetadata(entries: Unzipped): Promise<Unzipped> {
  return new Promise((resolve, reject) => {
    const { name, author, description } = getMetadata({ zipObjRaw: entries });
    if (name !== "" && author !== "" && description !== "") {
      resolve(entries);
      return;
    }

    const missingDetails = [name === "" ? "שם" : "", author === "" ? "יוצר" : "", description === "" ? "תיאור" : ""]
      .filter(detail => detail !== "")
      .join(", ");
    reject(`חסרים פרטים: ${missingDetails}`);
  });
}

function hasContentPath(entries: Unzipped): Promise<Unzipped> {
  return new Promise((resolve, reject) => {
    if (entries[Paths.content]) {
      resolve(entries);
      return;
    }

    reject("לא ניתן לאתר את תיקיית התוכן של המוד");
  });
}

function hasFiles(entries: Unzipped): Promise<Unzipped> {
  return new Promise((resolve, reject) => {
    const filePaths = Object.keys(entries).filter(path => !path.endsWith("/"));
    if (filePaths.length > 0) {
      resolve(entries);
      return;
    }

    reject("לא נמצאו תכנים בתיקיית התוכן של המוד");
  });
}

export function getCollidingModIds(filePaths: string[]): Set<string> {
  const filesUsed = get(filesInUse);
  return new Set(filePaths.filter(filename => filesUsed[filename]).map(filename => filesUsed[filename]));
}

function hasNoCollisions(entries: Unzipped): Promise<Unzipped> {
  return new Promise((resolve, reject) => {
    const filePaths = Object.keys(entries)
      .filter(path => !path.endsWith("/"))
      .map(path => path.replace(Paths.content, ""));
    modCollisions.set(getCollidingModIds(filePaths));
    if (get(modCollisions).size === 0) {
      resolve(entries);
      return;
    }

    // This message isn't being used
    // instead, $modCollisions is used to display the mod collisions in the UI
    reject(`התנגשות מודים`);
  });
}

export async function getIsModInstallable({
  zipEntries
}: {
  zipEntries: Unzipped;
}): Promise<{ error?: string; isValid?: boolean }> {
  return hasMetadata(zipEntries)
    .then(hasContentPath)
    .then(hasFiles)
    .then(hasNoCollisions)
    .then(() => ({ isValid: true }))
    .catch(error => ({ error }));
}
