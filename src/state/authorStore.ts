import { create } from "zustand";
import { v4 as uuid } from "uuid";
import type { ScaleCalibration, Viewport } from "../types";

export interface DraftMask {
  id: string;
  name: string;
  file: File;
  previewUrl: string;
  x: number;
  y: number;
  opacity: number;
  featherPx: number;
}

export interface DraftMaterial {
  id: string;
  name: string;
  file: File;
  previewUrl: string;
  imageWidthPx: number;
  imageHeightPx: number;
  /** Definidos só depois da calibração visual contra a planta (tamanho travado). */
  realWidthCm: number | null;
  realHeightCm: number | null;
}

interface AuthorState {
  scenarioName: string;
  planFile: File | null;
  planUrl: string | null;
  isometricFile: File | null;
  isometricUrl: string | null;
  scaleCalibration: ScaleCalibration | null;
  masks: DraftMask[];
  materials: DraftMaterial[];
  initialViewport: Viewport;

  setScenarioName: (name: string) => void;
  setPlanFile: (file: File) => void;
  setIsometricFile: (file: File) => void;
  setScaleCalibration: (calibration: ScaleCalibration) => void;
  clearScaleCalibration: () => void;
  addMask: (file: File) => Promise<void>;
  updateMask: (
    id: string,
    patch: Partial<Pick<DraftMask, "x" | "y" | "opacity" | "featherPx">>,
  ) => void;
  removeMask: (id: string) => void;
  addMaterial: (file: File) => Promise<void>;
  lockMaterialSize: (id: string, realWidthCm: number, realHeightCm: number) => void;
  removeMaterial: (id: string) => void;
  setInitialViewport: (viewport: Viewport) => void;
}

function loadImageSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = url;
  });
}

export const useAuthorStore = create<AuthorState>((set) => ({
  scenarioName: "",
  planFile: null,
  planUrl: null,
  isometricFile: null,
  isometricUrl: null,
  scaleCalibration: null,
  masks: [],
  materials: [],
  initialViewport: { x: 0, y: 0, scale: 1 },

  setScenarioName: (name) => set({ scenarioName: name }),

  setPlanFile: (file) =>
    set((state) => {
      if (state.planUrl) URL.revokeObjectURL(state.planUrl);
      return { planFile: file, planUrl: URL.createObjectURL(file) };
    }),

  setIsometricFile: (file) =>
    set((state) => {
      if (state.isometricUrl) URL.revokeObjectURL(state.isometricUrl);
      return { isometricFile: file, isometricUrl: URL.createObjectURL(file) };
    }),

  setScaleCalibration: (calibration) => set({ scaleCalibration: calibration }),

  clearScaleCalibration: () => set({ scaleCalibration: null }),

  addMask: async (file) => {
    const previewUrl = URL.createObjectURL(file);
    const { width, height } = await loadImageSize(previewUrl);
    const mask: DraftMask = {
      id: uuid(),
      name: file.name,
      file,
      previewUrl,
      x: 0,
      y: 0,
      opacity: 0.6,
      featherPx: Math.round(Math.max(width, height) * 0.03),
    };
    set((state) => ({ masks: [...state.masks, mask] }));
  },

  updateMask: (id, patch) =>
    set((state) => ({
      masks: state.masks.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),

  removeMask: (id) =>
    set((state) => ({ masks: state.masks.filter((m) => m.id !== id) })),

  addMaterial: async (file) => {
    const previewUrl = URL.createObjectURL(file);
    const { width, height } = await loadImageSize(previewUrl);
    const material: DraftMaterial = {
      id: uuid(),
      name: file.name,
      file,
      previewUrl,
      imageWidthPx: width,
      imageHeightPx: height,
      realWidthCm: null,
      realHeightCm: null,
    };
    set((state) => ({ materials: [...state.materials, material] }));
  },

  lockMaterialSize: (id, realWidthCm, realHeightCm) =>
    set((state) => ({
      materials: state.materials.map((m) =>
        m.id === id ? { ...m, realWidthCm, realHeightCm } : m,
      ),
    })),

  removeMaterial: (id) =>
    set((state) => ({ materials: state.materials.filter((m) => m.id !== id) })),

  setInitialViewport: (viewport) => set({ initialViewport: viewport }),
}));
