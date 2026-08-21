import type { Scenario } from "../types";

export interface ScenarioSummary {
  id: string;
  name: string;
}

function scenarioBaseUrl(id: string): string {
  return `${import.meta.env.BASE_URL}scenarios/${id}/`;
}

/** Resolve URLs relativas do manifest (ex.: "plan.svg") para o caminho público servido. */
function resolveScenarioUrls(scenario: Scenario, baseUrl: string): Scenario {
  return {
    ...scenario,
    isometricImageUrl: baseUrl + scenario.isometricImageUrl,
    planImageUrl: baseUrl + scenario.planImageUrl,
    masks: scenario.masks.map((mask) =>
      mask.type === "polygon" ? mask : { ...mask, imageUrl: baseUrl + mask.imageUrl },
    ),
    materials: scenario.materials.map((material) => ({
      ...material,
      imageUrl: baseUrl + material.imageUrl,
    })),
  };
}

export async function listScenarios(): Promise<ScenarioSummary[]> {
  const res = await fetch(`${import.meta.env.BASE_URL}scenarios/index.json`);
  if (!res.ok) throw new Error("Falha ao carregar lista de cenários");
  return res.json();
}

export async function loadScenario(id: string): Promise<Scenario> {
  const baseUrl = scenarioBaseUrl(id);
  const res = await fetch(`${baseUrl}manifest.json`);
  if (!res.ok) throw new Error(`Falha ao carregar cenário "${id}"`);
  const raw = (await res.json()) as Scenario;
  return resolveScenarioUrls(raw, baseUrl);
}
