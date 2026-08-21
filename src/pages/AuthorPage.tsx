import { useRef, useState } from "react";
import type Konva from "konva";
import { PlanCanvas } from "../components/canvas/PlanCanvas";
import { PlanImage } from "../components/canvas/PlanImage";
import { ReferenceLineOverlay } from "../components/author/ReferenceLineOverlay";
import { DraggableMaskImage } from "../components/author/DraggableMaskImage";
import { MaterialCalibrationShape } from "../components/author/MaterialCalibrationShape";
import { useElementSize } from "../hooks/useElementSize";
import { useAuthorStore } from "../state/authorStore";
import { calibrateScale, pixelsToCm } from "../lib/scale";
import { buildScenarioBundle, downloadBlob, validateBundleInput } from "../lib/authorBundle";
import type { Point } from "../types";
import styles from "./AuthorPage.module.css";

type AuthorMode = "calibrate" | "masks" | "materials";

function roundCm(cm: number): number {
  return Math.round(cm * 10) / 10;
}

export function AuthorPage() {
  const store = useAuthorStore();
  const { ref: containerRef, size } = useElementSize<HTMLDivElement>();
  const stageRef = useRef<Konva.Stage>(null);

  const [mode, setMode] = useState<AuthorMode>("calibrate");
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [calibrationPoints, setCalibrationPoints] = useState<Point[]>([]);
  const [realLengthInput, setRealLengthInput] = useState("");

  const [calibratingMaterialId, setCalibratingMaterialId] = useState<string | null>(null);
  const [calibrationShape, setCalibrationShape] = useState<{
    x: number;
    y: number;
    widthPx: number;
    heightPx: number;
  } | null>(null);

  const [exportError, setExportError] = useState<string[] | null>(null);
  const [exporting, setExporting] = useState(false);

  const calibratingMaterial = store.materials.find((m) => m.id === calibratingMaterialId) ?? null;

  function handleCanvasClick(point: Point) {
    if (mode !== "calibrate" || store.scaleCalibration) return;
    setCalibrationPoints((prev) => {
      if (prev.length >= 2) return [point];
      return [...prev, point];
    });
  }

  function handleConfirmCalibration() {
    const cm = Number(realLengthInput.replace(",", "."));
    if (!Number.isFinite(cm) || cm <= 0 || calibrationPoints.length !== 2) return;
    const calibration = calibrateScale(
      [calibrationPoints[0], calibrationPoints[1]],
      cm,
    );
    store.setScaleCalibration(calibration);
    setRealLengthInput("");
  }

  function handleResetCalibration() {
    store.clearScaleCalibration();
    setCalibrationPoints([]);
    setRealLengthInput("");
  }

  function startCalibratingMaterial(materialId: string) {
    const material = store.materials.find((m) => m.id === materialId);
    if (!material) return;
    setCalibratingMaterialId(materialId);
    const startWidth = Math.min(material.imageWidthPx, 200);
    const scaleRatio = startWidth / material.imageWidthPx;
    setCalibrationShape({
      x: (size.width / 2 - viewport.x) / viewport.scale,
      y: (size.height / 2 - viewport.y) / viewport.scale,
      widthPx: startWidth,
      heightPx: material.imageHeightPx * scaleRatio,
    });
  }

  function handleLockMaterialSize() {
    if (!calibratingMaterial || !calibrationShape || !store.scaleCalibration) return;
    const realWidthCm = roundCm(pixelsToCm(calibrationShape.widthPx, store.scaleCalibration));
    const realHeightCm = roundCm(pixelsToCm(calibrationShape.heightPx, store.scaleCalibration));
    store.lockMaterialSize(calibratingMaterial.id, realWidthCm, realHeightCm);
    setCalibratingMaterialId(null);
    setCalibrationShape(null);
  }

  async function handleExport() {
    const errors = validateBundleInput({
      scenarioName: store.scenarioName,
      planFile: store.planFile,
      isometricFile: store.isometricFile,
      scaleCalibration: store.scaleCalibration,
      materials: store.materials,
    });
    if (errors.length > 0) {
      setExportError(errors.map((e) => e.message));
      return;
    }
    setExportError(null);
    setExporting(true);
    try {
      const blob = await buildScenarioBundle({
        scenarioName: store.scenarioName,
        planFile: store.planFile!,
        isometricFile: store.isometricFile!,
        scaleCalibration: store.scaleCalibration!,
        masks: store.masks,
        materials: store.materials,
        initialViewport: store.initialViewport,
      });
      downloadBlob(blob, `${store.scenarioName || "cenario"}.zip`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <h1 className={styles.title}>Modo Autor</h1>

        <label className={styles.field}>
          <span>Nome do cenário</span>
          <input
            type="text"
            value={store.scenarioName}
            onChange={(e) => store.setScenarioName(e.target.value)}
            placeholder="Ex: Casa da praia — banheiro"
          />
        </label>

        <label className={styles.field}>
          <span>Planta (imagem)</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) store.setPlanFile(file);
            }}
          />
        </label>

        <label className={styles.field}>
          <span>Isométrica (contexto)</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) store.setIsometricFile(file);
            }}
          />
        </label>

        <nav className={styles.modeTabs}>
          <button
            type="button"
            className={mode === "calibrate" ? styles.modeTabActive : styles.modeTab}
            onClick={() => setMode("calibrate")}
          >
            Escala
          </button>
          <button
            type="button"
            className={mode === "masks" ? styles.modeTabActive : styles.modeTab}
            onClick={() => setMode("masks")}
          >
            Máscaras
          </button>
          <button
            type="button"
            className={mode === "materials" ? styles.modeTabActive : styles.modeTab}
            onClick={() => setMode("materials")}
          >
            Materiais
          </button>
        </nav>

        {mode === "calibrate" && (
          <div className={styles.section}>
            {store.scaleCalibration ? (
              <>
                <p className={styles.hint}>
                  Calibrado: {store.scaleCalibration.pixelsPerCm.toFixed(3)} px/cm
                </p>
                <button type="button" onClick={handleResetCalibration}>
                  Recalibrar
                </button>
              </>
            ) : (
              <>
                <p className={styles.hint}>
                  Clique dois pontos na planta sobre uma cota conhecida (ex: uma
                  parede que você sabe o comprimento real).
                </p>
                {calibrationPoints.length === 2 && (
                  <label className={styles.field}>
                    <span>Comprimento real (cm)</span>
                    <input
                      type="number"
                      value={realLengthInput}
                      onChange={(e) => setRealLengthInput(e.target.value)}
                      placeholder="Ex: 320"
                      autoFocus
                    />
                  </label>
                )}
                {calibrationPoints.length === 2 && (
                  <button type="button" onClick={handleConfirmCalibration}>
                    Confirmar calibração
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {mode === "masks" && (
          <div className={styles.section}>
            <label className={styles.field}>
              <span>Adicionar máscara</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) store.addMask(file);
                }}
              />
            </label>
            {store.masks.map((mask) => (
              <div key={mask.id} className={styles.listItem}>
                <span>{mask.name}</span>
                <label>
                  Opacidade
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={mask.opacity}
                    onChange={(e) =>
                      store.updateMask(mask.id, { opacity: Number(e.target.value) })
                    }
                  />
                </label>
                <button type="button" onClick={() => store.removeMask(mask.id)}>
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}

        {mode === "materials" && (
          <div className={styles.section}>
            <label className={styles.field}>
              <span>Adicionar material</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) store.addMaterial(file);
                }}
              />
            </label>
            {!store.scaleCalibration && (
              <p className={styles.hint}>Calibre a escala antes de calibrar materiais.</p>
            )}
            {store.materials.map((material) => (
              <div key={material.id} className={styles.listItem}>
                <span>{material.name}</span>
                {material.realWidthCm != null ? (
                  <span className={styles.hint}>
                    {material.realWidthCm.toFixed(1)}×{material.realHeightCm!.toFixed(1)} cm
                  </span>
                ) : calibratingMaterialId === material.id ? (
                  <span className={styles.hint}>calibrando…</span>
                ) : (
                  <button
                    type="button"
                    disabled={!store.scaleCalibration}
                    onClick={() => startCalibratingMaterial(material.id)}
                  >
                    Calibrar tamanho
                  </button>
                )}
                <button type="button" onClick={() => store.removeMaterial(material.id)}>
                  Remover
                </button>
              </div>
            ))}

            {calibratingMaterial && calibrationShape && (
              <div className={styles.section}>
                <p className={styles.hint}>
                  Arraste os cantos até o tamanho real de "{calibratingMaterial.name}"
                  na planta. Tamanho atual:{" "}
                  {pixelsToCm(calibrationShape.widthPx, store.scaleCalibration!).toFixed(1)}×
                  {pixelsToCm(calibrationShape.heightPx, store.scaleCalibration!).toFixed(1)} cm
                </p>
                <button type="button" onClick={handleLockMaterialSize}>
                  Travar tamanho
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCalibratingMaterialId(null);
                    setCalibrationShape(null);
                  }}
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}

        <div className={styles.section}>
          <button type="button" onClick={() => store.setInitialViewport(viewport)}>
            Usar visão atual como inicial
          </button>
          <p className={styles.hint}>
            zoom {store.initialViewport.scale.toFixed(2)}, x{" "}
            {store.initialViewport.x.toFixed(0)}, y {store.initialViewport.y.toFixed(0)}
          </p>
        </div>

        <div className={styles.section}>
          {exportError && (
            <ul className={styles.errorList}>
              {exportError.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          )}
          <button type="button" onClick={handleExport} disabled={exporting}>
            {exporting ? "Gerando…" : "Exportar bundle (.zip)"}
          </button>
        </div>
      </aside>

      <div ref={containerRef} className={styles.canvasArea}>
        {size.width > 0 && (
          <PlanCanvas
            width={size.width}
            height={size.height}
            viewport={viewport}
            onViewportChange={setViewport}
            onBackgroundClick={handleCanvasClick}
            stageRef={stageRef}
          >
            {store.planUrl && <PlanImage src={store.planUrl} />}

            {mode === "calibrate" && !store.scaleCalibration && (
              <ReferenceLineOverlay
                points={calibrationPoints}
                inverseScale={1 / viewport.scale}
              />
            )}
            {store.scaleCalibration && (
              <ReferenceLineOverlay
                points={store.scaleCalibration.referenceLine}
                inverseScale={1 / viewport.scale}
              />
            )}

            {mode === "masks" &&
              store.masks.map((mask) => (
                <DraggableMaskImage
                  key={mask.id}
                  mask={mask}
                  onMove={(x, y) => store.updateMask(mask.id, { x, y })}
                />
              ))}

            {calibratingMaterial && calibrationShape && (
              <MaterialCalibrationShape
                material={calibratingMaterial}
                size={{ widthPx: calibrationShape.widthPx, heightPx: calibrationShape.heightPx }}
                position={{ x: calibrationShape.x, y: calibrationShape.y }}
                onChange={setCalibrationShape}
              />
            )}
          </PlanCanvas>
        )}
        {!store.planUrl && (
          <div className={styles.emptyState}>Faça upload de uma planta pra começar.</div>
        )}
      </div>
    </div>
  );
}
