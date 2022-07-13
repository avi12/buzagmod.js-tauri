<script lang="ts">
  import type { Unzipped } from "fflate";
  import * as fflate from "fflate";
  import MD5 from "md5";
  import { Card } from "svelte-materialify";
  import { createEventDispatcher, onDestroy, onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { v5 as UUID } from "uuid";
  import { appWindow } from "@tauri-apps/api/window";
  import type { UnlistenFn } from "@tauri-apps/api/event";
  import { BaseDirectory, createDir, writeBinaryFile } from "@tauri-apps/api/fs";
  import { path } from "@tauri-apps/api";
  import { createOrUpdateJson, getModsJson, getPath } from "../fs";
  import type { ModMetadata } from "../global.interfaces";
  import { PathModsFile } from "../global.interfaces";
  import { delay, duration } from "../core/transition-utils";
  import {
    errorMessage,
    getIconDataUrl,
    getIconPath,
    modCollisions,
    Paths,
    regexSupportedFiles,
    UUID_FIXED
  } from "../shared";
  import { getIsModInstallable, getMetadata } from "./is-mod-installable";
  import "./Dropzone.scss";

  const dispatch = createEventDispatcher();

  function getIsFileZip(file: File): boolean {
    return file.type === "application/zip" || file.type === "application/x-zip-compressed";
  }

  async function saveModToDisk({
    author,
    zipEntries,
    name,
    description,
    uuid
  }: {
    zipEntries: Unzipped;
    author: string;
    name: string;
    description: string;
    uuid: string;
  }): Promise<void> {
    const fileEntries = Object.fromEntries(
      Object.entries(zipEntries).filter(([path]: [string, Uint8Array]) => !path.endsWith("/"))
    );
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
      [uuid]: {
        files,
        metadata: {
          author,
          name,
          description
        }
      }
    };
    await createOrUpdateJson(PathModsFile.enabled, JSON.stringify(modsJson));
  }

  async function getIcon({ zipEntries, uuid }: { uuid: string; zipEntries?: Unzipped }): Promise<string> {
    return getIconDataUrl(zipEntries[getIconPath(uuid)] || new Uint8Array(0));
  }

  function getZipEntries({ uuid, zipObjRaw }: { uuid: string; zipObjRaw: Unzipped }): Unzipped {
    const pathIconOriginal = "icon.jpg";
    const zipEntries = { ...zipObjRaw };
    if (zipEntries[pathIconOriginal]) {
      zipEntries[getIconPath(uuid)] = zipObjRaw[pathIconOriginal];
    }
    for (const path in zipEntries) {
      if (path !== Paths.content && !path.match(regexSupportedFiles)) {
        delete zipEntries[path];
      }
    }
    return zipEntries;
  }

  async function onDrop(e: DragEvent): Promise<void> {
    const onError: () => boolean = () => dispatch("error", name);
    const [file] = e.dataTransfer.files;
    if (!getIsFileZip(file)) {
      $errorMessage = "נא להעלות קובץ מסוג ZIP";
      onError();
      return;
    }

    const zipObjRaw = fflate.unzipSync(new Uint8Array(await file.arrayBuffer()));
    const { name, description, author } = getMetadata({ zipObjRaw });
    const uuid = UUID(name, UUID_FIXED);
    const zipEntries = getZipEntries({ zipObjRaw, uuid });
    const { error, isValid } = await getIsModInstallable({ zipEntries });
    if (!isValid) {
      $errorMessage = error;
      onError();
      return;
    }

    $errorMessage = "";

    await saveModToDisk({ name, description, author, zipEntries, uuid });

    dispatch("addedMod", {
      [uuid]: {
        files: zipEntries,
        icon: await getIcon({ zipEntries, uuid }),
        metadata: {
          name,
          description,
          author,
          md5: new MD5(file),
          files: Object.keys(zipEntries)
            .map(path => path.replace(Paths.content, ""))
            .filter(path => path && !path.match(regexSupportedFiles))
        }
      }
    } as ModMetadata);
  }

  let isDragOver = false;

  let unlistenFileDrop: UnlistenFn;

  onMount(async () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    unlistenFileDrop = await appWindow.onFileDropEvent(() => {});
  });

  onDestroy(() => {
    unlistenFileDrop?.();
  });
</script>

<article class="dropzone-wrapper" in:fade|local={{ delay, duration }} out:fade={{ duration }}>
  <Card class="pa-5 dropzone" outlined>
    <section
      class="center-text drag-over dropzone-overlay"
      class:drag-over--error={$errorMessage !== "" && $modCollisions.size === 0}
      class:drag-over--hover={isDragOver}
      on:dragenter={() => (isDragOver = true)}
      on:dragleave={() => (isDragOver = false)}
      on:dragover|preventDefault
      on:drop|preventDefault={onDrop}
    >
      {#if $errorMessage !== "" && $modCollisions.size === 0}
        <div class="text-body pointer-events-none">{$errorMessage}</div>
      {:else}
        <div class="text-h5 pointer-events-none">גרור לכאן קובץ מוד</div>
      {/if}
      <img
        alt="Open Day logo"
        class="logo pointer-events-none"
        src="data:image/png;base64,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"
      />
    </section>
  </Card>
</article>

<style lang="scss">
  .logo {
    width: 100px;
    position: absolute;
    $paddingFromTopLeft: 20px;
    top: $paddingFromTopLeft;
    left: $paddingFromTopLeft;
    -webkit-user-drag: none;
  }

  section {
    width: 100%;
    height: 100%;
  }

  .center-text {
    display: grid;
    place-items: center;
  }

  .dropzone-wrapper {
    display: grid;
    place-items: center;
    height: 100%;
    user-select: none;
  }

  .pointer-events-none {
    pointer-events: none;
  }

  .drag-over {
    transition: background-color 0.3s ease-in-out;

    &--hover {
      background-color: #f5f5f5;
    }

    &--error {
      background-color: hsl(342, 100%, 90%) !important;
    }
  }
</style>
