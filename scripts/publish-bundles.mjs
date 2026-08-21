#!/usr/bin/env node
/**
 * Extrai todos os .zip de bundles/ (exportados pelo Modo Autor) para
 * public/scenarios/<id>/ e atualiza public/scenarios/index.json.
 *
 * Uso: npm run publish-bundles
 * Depois: git add public/scenarios, commit e push (o deploy no GitHub
 * Pages roda automático via Actions).
 */
import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUNDLES_DIR = path.join(ROOT, "bundles");
const SCENARIOS_DIR = path.join(ROOT, "public", "scenarios");
const INDEX_PATH = path.join(SCENARIOS_DIR, "index.json");

async function loadIndex() {
  if (!existsSync(INDEX_PATH)) return [];
  const raw = await readFile(INDEX_PATH, "utf-8");
  return JSON.parse(raw);
}

async function saveIndex(list) {
  await mkdir(SCENARIOS_DIR, { recursive: true });
  await writeFile(INDEX_PATH, JSON.stringify(list, null, 2) + "\n", "utf-8");
}

async function publishBundle(zipPath) {
  const buffer = await readFile(zipPath);
  const zip = await JSZip.loadAsync(buffer);

  const manifestEntry = zip.file("manifest.json");
  if (!manifestEntry) {
    console.warn(`  ! ${path.basename(zipPath)}: sem manifest.json, pulando`);
    return null;
  }
  const manifest = JSON.parse(await manifestEntry.async("string"));
  const { id, name } = manifest;
  if (!id) {
    console.warn(`  ! ${path.basename(zipPath)}: manifest sem "id", pulando`);
    return null;
  }

  const targetDir = path.join(SCENARIOS_DIR, id);
  await rm(targetDir, { recursive: true, force: true });
  await mkdir(targetDir, { recursive: true });

  const fileEntries = Object.values(zip.files).filter((entry) => !entry.dir);
  for (const entry of fileEntries) {
    const destPath = path.join(targetDir, entry.name);
    await mkdir(path.dirname(destPath), { recursive: true });
    await writeFile(destPath, await entry.async("nodebuffer"));
  }

  console.log(`  ✓ ${path.basename(zipPath)} -> public/scenarios/${id} ("${name}")`);
  return { id, name };
}

async function main() {
  if (!existsSync(BUNDLES_DIR)) {
    console.log(`Pasta ${BUNDLES_DIR} não existe.`);
    console.log('Crie "bundles/" e coloque os .zip exportados no Modo Autor lá.');
    return;
  }

  const files = (await readdir(BUNDLES_DIR)).filter((f) => f.toLowerCase().endsWith(".zip"));
  if (files.length === 0) {
    console.log("Nenhum .zip encontrado em bundles/.");
    return;
  }

  console.log(`Publicando ${files.length} bundle(s) de bundles/...\n`);

  const index = await loadIndex();
  const byId = new Map(index.map((s) => [s.id, s]));

  for (const file of files) {
    const result = await publishBundle(path.join(BUNDLES_DIR, file));
    if (result) byId.set(result.id, result);
  }

  await saveIndex(Array.from(byId.values()));
  console.log(`\npublic/scenarios/index.json atualizado — ${byId.size} cenário(s) no total.`);
  console.log("Próximo passo: git add public/scenarios && git commit && git push");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
