import { filesInUse, getModFilesToUuids, modsOff, modsOn } from "./shared";
import App from "./App.svelte";
import { Api } from "./global.interfaces";

async function main(): Promise<void> {
  const { modsEnabled, modsDisabled } = await Api.loadMods();
  modsOn.set(modsEnabled);
  modsOff.set(modsDisabled);
  filesInUse.set(getModFilesToUuids());
  new App({ target: document.body });
}

main();
