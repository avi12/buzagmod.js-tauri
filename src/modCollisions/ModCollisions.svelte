<script lang="ts">
  import { Button, ExpansionPanel, ExpansionPanels, Icon, ListItem } from "svelte-materialify";
  import { mdiDelete } from "@mdi/js";
  import { deleteMod, modCollisions } from "../shared";
  import ModToDelete from "../modToDelete/ModToDelete.svelte";
  import "./ModCollisions.scss";

  export let lastModActive = "";

  async function deleteCollidingMods(): Promise<void> {
    const deleteQueue = [...$modCollisions].map(uuid => deleteMod(uuid));
    await Promise.all(deleteQueue);
  }
</script>

<ExpansionPanels disabled value={$modCollisions.size > 0 ? [0] : []}>
  <ExpansionPanel>
    {#if $modCollisions.size > 0}
      <article class="collisions-list-container">
        <section class="text-body">ישנה התנגשות בין המוד "{lastModActive}" והמודים:</section>
        <section class="collisions-list">
          {#each [...$modCollisions] as uuid}
            <ListItem class="list-item-mod-to-delete">
              <ModToDelete {uuid} />
            </ListItem>
          {/each}
        </section>
        <Button class="btn-delete-collisions" on:click={deleteCollidingMods}>
          <Icon path={mdiDelete} />
          מחק התנגשויות
        </Button>
      </article>
    {/if}
  </ExpansionPanel>
</ExpansionPanels>

<style lang="scss">
  .collisions-list-container {
    flex: 1;
  }

  .collisions-list {
    overflow-y: scroll;
    max-height: 100px;
    margin-bottom: 10px;
  }
</style>
