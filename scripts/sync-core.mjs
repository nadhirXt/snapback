#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const coreDir = path.join(rootDir, "core");
const targets = [
  path.join(rootDir, "extension", "src", "lib"),
  path.join(rootDir, "desktop", "ui", "lib")
];

const checkOnly = process.argv.includes("--check");
const coreFiles = fs
  .readdirSync(coreDir)
  .filter((f) => f.endsWith(".js"))
  .sort();

let mismatch = false;

for (const targetDir of targets) {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const file of coreFiles) {
    const srcPath = path.join(coreDir, file);
    const dstPath = path.join(targetDir, file);
    const srcContent = fs.readFileSync(srcPath, "utf8");

    if (checkOnly) {
      if (!fs.existsSync(dstPath) || fs.readFileSync(dstPath, "utf8") !== srcContent) {
        console.error(`Out of sync: ${path.relative(rootDir, dstPath)}`);
        mismatch = true;
      }
    } else {
      fs.writeFileSync(dstPath, srcContent, "utf8");
    }
  }
}

if (checkOnly && mismatch) {
  process.exit(1);
}
if (!checkOnly) {
  console.log(`Synced ${coreFiles.length} core modules to extension/src/lib and desktop/ui/lib`);
}
