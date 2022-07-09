<script lang="ts">
  import { Avatar, Button, Checkbox, Icon, ListItem } from "svelte-materialify";
  import { mdiDelete } from "@mdi/js";
  import {
    deleteMod,
    errorMessage,
    filesInUse,
    getModFilesToUuids,
    modCollisions,
    modsOff,
    modsOn,
    UUID_FIXED
  } from "../shared";
  import { createEventDispatcher } from "svelte";
  import { getCollidingModIds } from "../dropzone/is-mod-installable";
  import { v5 as UUID } from "uuid";
  import type { ModSingle } from "../global.interfaces";
  import "./Mod.scss";
  import { Api } from "../global.interfaces";

  export let mod: ModSingle;
  // noinspection JSUnusedAssignment
  export let uuid = UUID(mod.metadata.name, UUID_FIXED);

  let isShowError = false;
  let isModEnabled = Boolean($modsOn[uuid]);
  $: src = mod?.icon !== "data:" ? mod?.icon : "logo.png";

  const dispatch = createEventDispatcher();

  async function enableMod(uuid): Promise<void> {
    const modDisabled = $modsOff[uuid] || ({} as ModSingle);
    $modsOn = { ...$modsOn, [uuid]: modDisabled };
    $modsOff = (({ [uuid]: _, ...modsOff }) => modsOff)($modsOff);
    isModEnabled = true;

    $filesInUse = getModFilesToUuids();

    await Api.enableMod(uuid);
  }

  async function disableMod(uuid): Promise<void> {
    const modEnabled = $modsOn[uuid] || ({} as ModSingle);
    $modsOff = { ...$modsOff, [uuid]: { ...modEnabled } };
    $modsOn = (({ [uuid]: _, ...modsOn }) => modsOn)($modsOn);

    $modCollisions.delete(uuid);
    $modCollisions = $modCollisions;
    for (const file in $filesInUse) {
      if ($filesInUse[file] === uuid) {
        delete $filesInUse[file];
      }
    }

    await Api.disableMod(uuid);
  }

  async function enableModIfNotColliding(uuid: string): void {
    const collidingModIds = getCollidingModIds($modsOff[uuid].metadata.files);
    if (collidingModIds.size === 0) {
      await enableMod(uuid);
      isShowError = false;
      return;
    }
    for (const uuid of collidingModIds) {
      $modCollisions.add(uuid);
    }
    $modCollisions = $modCollisions;

    dispatch("collidingMod", $modsOff[uuid].metadata.name);
    isModEnabled = false;
    isShowError = true;

    $errorMessage = "התנגשות";
  }
</script>

<ListItem>
  <span class="d-flex" slot="prepend">
    <Checkbox
      bind:checked={isModEnabled}
      color={isShowError ? "error" : "secondary"}
      on:change={e => (e.target.checked ? enableModIfNotColliding(uuid) : disableMod(uuid))}
    />
    <Avatar size="80px">
      <img alt="" class="icon" {src} />
    </Avatar>
  </span>
  {mod?.metadata.name}
  <div slot="subtitle">
    <div>{mod?.metadata.description}</div>
    <div>מאת: {mod?.metadata.author}</div>
  </div>
  <span slot="append">
    <Button icon on:click={() => deleteMod(uuid)}>
      <Icon path={mdiDelete} />
    </Button>
  </span>
</ListItem>

<style lang="scss">
  .icon {
    object-fit: contain;
  }
</style>
