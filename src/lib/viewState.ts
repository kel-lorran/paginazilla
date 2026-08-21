import type { Viewport } from "../types";

export interface SavedViewState {
  viewport: Viewport;
  gridEnabled: boolean;
  gridSpacingCm: number;
}

function key(scenarioId: string): string {
  return `paginazilla:view:${scenarioId}`;
}

export function loadViewState(scenarioId: string): SavedViewState | null {
  try {
    const raw = localStorage.getItem(key(scenarioId));
    if (!raw) return null;
    return JSON.parse(raw) as SavedViewState;
  } catch {
    return null;
  }
}

export function saveViewState(scenarioId: string, state: SavedViewState): void {
  try {
    localStorage.setItem(key(scenarioId), JSON.stringify(state));
  } catch {
    // localStorage indisponível (ex: navegação privada) — só não persiste
  }
}
