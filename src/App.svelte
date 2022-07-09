<script lang="ts">
  import { MaterialApp } from "svelte-materialify";
  import { filesInUse, modsOn, modsOff } from "./shared";
  import { theme } from "./core/dark-mode";
  import Dropzone from "./dropzone/Dropzone.svelte";
  import ModList from "./modList/ModList.svelte";
  import "./App.scss";

  function onAddedMod(e): void {
    const modNew = e.detail;
    $modsOn = { ...$modsOn, ...modNew };
    const [uuid] = Object.keys(modNew);
    for (const file of modNew[uuid].metadata.files) {
      $filesInUse[file] = uuid;
    }
  }
</script>

<MaterialApp theme={$theme}>
  {#if Object.keys($modsOn).length === 0 && Object.keys($modsOff).length === 0}
    <Dropzone on:addedMod={onAddedMod} />
  {:else}
    <ModList />
  {/if}
</MaterialApp>
