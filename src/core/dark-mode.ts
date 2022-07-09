import { writable } from "svelte/store";

const instanceDarkMode = matchMedia("(prefers-color-scheme: dark)");
export const theme = writable(instanceDarkMode.matches ? "dark" : "light");

instanceDarkMode.addEventListener("change", ({ matches }) => {
  theme.set(matches ? "dark" : "light");
});
