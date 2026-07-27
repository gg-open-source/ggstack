#!/usr/bin/env node
import { fileURLToPath } from "node:url";

export const main = async () => {
  console.log("ggstack — coming soon");
};

const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] === scriptPath) {
  main().catch(console.error);
}
