import JSZip from "jszip";
import type { DraftMask, DraftMaterial } from "../state/authorStore";
import type { MaskLayer, Material, Scenario, ScaleCalibration, Viewport } from "../types";

function slugify(text: string): string {
  const withoutDiacritics = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  const slug = withoutDiacritics.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return slug || "cenario";
}

function fileExtension(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type.split("/").pop() ?? "png";
}

export interface BundleInput {
  scenarioName: string;
  planFile: File;
  isometricFile: File;
  scaleCalibration: ScaleCalibration;
  masks: DraftMask[];
  materials: DraftMaterial[];
  initialViewport: Viewport;
}

export interface BundleValidationError {
  field: string;
  message: string;
}

export function validateBundleInput(input: {
  scenarioName: string;
  planFile: File | null;
  isometricFile: File | null;
  scaleCalibration: ScaleCalibration | null;
  materials: DraftMaterial[];
}): BundleValidationError[] {
  const errors: BundleValidationError[] = [];
  if (!input.scenarioName.trim()) {
    errors.push({ field: "scenarioName", message: "Dê um nome ao cenário." });
  }
  if (!input.planFile) {
    errors.push({ field: "planFile", message: "Faça upload da planta." });
  }
  if (!input.isometricFile) {
    errors.push({ field: "isometricFile", message: "Faça upload da isométrica." });
  }
  if (!input.scaleCalibration) {
    errors.push({ field: "scaleCalibration", message: "Calibre a escala da planta." });
  }
  if (input.materials.length === 0) {
    errors.push({ field: "materials", message: "Cadastre ao menos um material." });
  }
  const uncalibrated = input.materials.filter((m) => m.realWidthCm == null);
  if (uncalibrated.length > 0) {
    errors.push({
      field: "materials",
      message: `${uncalibrated.length} material(is) sem tamanho calibrado.`,
    });
  }
  return errors;
}

export async function buildScenarioBundle(input: BundleInput): Promise<Blob> {
  const id = slugify(input.scenarioName);
  const zip = new JSZip();

  const planExt = fileExtension(input.planFile);
  const isometricExt = fileExtension(input.isometricFile);
  zip.file(`plan.${planExt}`, input.planFile);
  zip.file(`isometric.${isometricExt}`, input.isometricFile);

  const masks: MaskLayer[] = [];
  for (const mask of input.masks) {
    if (mask.type === "polygon") {
      masks.push({
        type: "polygon",
        id: mask.id,
        name: mask.name,
        points: mask.points,
        opacity: mask.opacity,
      });
      continue;
    }
    const ext = fileExtension(mask.file);
    const filename = `masks/${mask.id}.${ext}`;
    zip.file(filename, mask.file);
    masks.push({
      type: "image",
      id: mask.id,
      name: mask.name,
      imageUrl: filename,
      x: mask.x,
      y: mask.y,
      opacity: mask.opacity,
      featherPx: mask.featherPx,
    });
  }

  const materials: Material[] = [];
  for (const material of input.materials) {
    if (material.realWidthCm == null || material.realHeightCm == null) continue;
    const ext = fileExtension(material.file);
    const filename = `materials/${material.id}.${ext}`;
    zip.file(filename, material.file);
    materials.push({
      id: material.id,
      name: material.name,
      imageUrl: filename,
      realWidthCm: material.realWidthCm,
      realHeightCm: material.realHeightCm,
    });
  }

  const manifest: Scenario = {
    id,
    name: input.scenarioName,
    isometricImageUrl: `isometric.${isometricExt}`,
    planImageUrl: `plan.${planExt}`,
    scaleCalibration: input.scaleCalibration,
    masks,
    materials,
    initialViewport: input.initialViewport,
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  return zip.generateAsync({ type: "blob" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
