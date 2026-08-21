#!/usr/bin/env node
/**
 * Remove um cenário publicado: apaga public/scenarios/<id>/ e tira a
 * entrada correspondente de public/scenarios/index.json.
 *
 * Uso:
 *   node scripts/remove-scenario.mjs <id>          # só localmente
 *   node scripts/remove-scenario.mjs <id> --push   # + commit e push
 */
import { readFile, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { commitAndPush } from "./lib/git.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCENARIOS_DIR = path.join(ROOT, "public", "scenarios");
const INDEX_PATH = path.join(SCENARIOS_DIR, "index.json");

const args = process.argv.slice(2);
const shouldPush = args.includes("--push");
const id = args.find((a) => !a.startsWith("--"));

async function main() {
  if (!id) {
    console.error("Uso: node scripts/remove-scenario.mjs <id> [--push]");
    console.error("IDs disponíveis:");
    const index = JSON.parse(await readFile(INDEX_PATH, "utf-8"));
    for (const s of index) console.error(`  - ${s.id} ("${s.name}")`);
    process.exitCode = 1;
    return;
  }

  const targetDir = path.join(SCENARIOS_DIR, id);
  const existedOnDisk = existsSync(targetDir);
  if (existedOnDisk) {
    await rm(targetDir, { recursive: true, force: true });
    console.log(`✓ Removida a pasta public/scenarios/${id}/`);
  } else {
    console.warn(`! Pasta public/scenarios/${id}/ não existia.`);
  }

  const index = JSON.parse(await readFile(INDEX_PATH, "utf-8"));
  const nextIndex = index.filter((s) => s.id !== id);
  if (nextIndex.length === index.length) {
    console.warn(`! "${id}" não estava em index.json.`);
  } else {
    await writeFile(INDEX_PATH, JSON.stringify(nextIndex, null, 2) + "\n", "utf-8");
    console.log(`✓ Removida a entrada de "${id}" em index.json`);
  }

  if (shouldPush) {
    commitAndPush(ROOT, "public/scenarios", `Remove cenário: ${id}`);
  } else {
    console.log("\nPróximo passo: git add public/scenarios && git commit && git push");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
