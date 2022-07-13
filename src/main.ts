import App from "./App.svelte";
import { filesInUse, getModFilesToUuids, modsOff, modsOn } from "./shared";
import { getIcon, getModsJson } from "./fs";
import { PathModsFile } from "./global.interfaces";
import type { ModMetadata, Mods } from "./global.interfaces";

async function loadMods(): Promise<{ modsEnabled: Mods; modsDisabled: Mods }> {
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
}

async function main(): Promise<void> {
  const { modsEnabled, modsDisabled } = await loadMods();
  modsOn.set(modsEnabled);
  modsOff.set(modsDisabled);
  filesInUse.set(getModFilesToUuids());
  new App({ target: document.body });
}

main();
