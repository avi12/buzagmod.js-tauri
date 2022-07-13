<script lang="ts">
  import { AppBar, Button, Dialog, Icon, Tooltip } from "svelte-materialify";
  import { mdiDelete, mdiPlus } from "@mdi/js";
  import { fade } from "svelte/transition";
  import { flip } from "svelte/animate";
  import Dropzone from "../dropzone/Dropzone.svelte";
  import Mod from "../mod/Mod.svelte";
  import ModCollisions from "../modCollisions/ModCollisions.svelte";
  import { errorMessage, filesInUse, modCollisions, modsOff, modsOn } from "../shared";
  import { delay, duration } from "../core/transition-utils";
  import { theme } from "../core/dark-mode";
  import { deleteModFromFs } from "../fs";
  import "./ModList.scss";

  let isShowDropzone = false;
  let lastModActive = "";

  function onAddedMod(e): void {
    const modNew = e.detail;
    $modsOn = { ...$modsOn, ...modNew };
    const [uuid] = Object.keys(modNew);
    for (const file of modNew[uuid].metadata.files) {
      $filesInUse[file] = uuid;
    }
    isShowDropzone = false;
  }

  function onError(e): void {
    lastModActive = e.detail;
    if ($modCollisions.size > 0) {
      isShowDropzone = false;
      $errorMessage = "";
    }
  }

  async function deleteAllMods(): Promise<void> {
    $modsOn = {};
    $modsOff = {};
    $modCollisions.clear();
    $errorMessage = "";
    $filesInUse = {};

    for (const modId in $modsOn) {
      await deleteModFromFs(modId);
    }

    for (const modId in $modsOff) {
      await deleteModFromFs(modId);
    }
  }

  $: modsAll = [...Object.entries($modsOn), ...Object.entries($modsOff)];
</script>

<article in:fade|local={{ delay, duration }} out:fade={{ duration }}>
  <AppBar class="secondary-color theme--dark">
    <span class="flex-grow-1 text-h6">רשימת מודים</span>
    <div class="header-icon-container d-flex">
      <Tooltip active={false} bottom>
        <Button icon on:click={() => (isShowDropzone = !isShowDropzone)}>
          <Icon path={mdiPlus} />
        </Button>
        <span slot="tip">הוסף מוד</span>
      </Tooltip>
      <Tooltip active={false} bottom>
        <Button icon on:click={deleteAllMods} outlined={$theme === "dark"}>
          <Icon path={mdiDelete} />
        </Button>
        <span slot="tip">מחק את כל המודים</span>
      </Tooltip>
    </div>
  </AppBar>

  {#each modsAll as [uuid, mod], i (uuid)}
    <div animate:flip={{ duration: 200 }}>
      <Mod {uuid} {mod} on:collidingMod={({ detail: modName }) => (lastModActive = modName)} />
    </div>
  {/each}
</article>

<ModCollisions {lastModActive} />

<Dialog bind:active={isShowDropzone} class="pa-4">
  <Dropzone on:addedMod={onAddedMod} on:error={onError} />
</Dialog>

<style lang="scss">
  .header-icon-container {
    flex: 0;
    margin-inline-end: 12px;
  }
</style>
