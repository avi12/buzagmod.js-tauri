import { filesInUse, getModFilesToUuids, modsOff, modsOn } from "./shared";
import { Api } from "./fs";
import App from "./App.svelte";

async function main(): Promise<void> {
  const { modsEnabled, modsDisabled } = await Api.loadMods();
  modsOn.set(modsEnabled);
  modsOff.set(modsDisabled);
  filesInUse.set(getModFilesToUuids());
  new App({ target: document.body });
}

main();
