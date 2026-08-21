import { openDB, type DBSchema } from "idb";
import type { MosaicProgress } from "../types";

interface PaginazillaDB extends DBSchema {
  progress: {
    key: string;
    value: MosaicProgress;
  };
}

const dbPromise = openDB<PaginazillaDB>("paginazilla", 1, {
  upgrade(db) {
    db.createObjectStore("progress", { keyPath: "scenarioId" });
  },
});

export async function saveProgress(progress: MosaicProgress): Promise<void> {
  const db = await dbPromise;
  await db.put("progress", progress);
}

export async function loadProgress(scenarioId: string): Promise<MosaicProgress | undefined> {
  const db = await dbPromise;
  return db.get("progress", scenarioId);
}
