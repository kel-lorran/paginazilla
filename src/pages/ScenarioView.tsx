import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { v4 as uuid } from "uuid";
import type Konva from "konva";
import { PlanCanvas } from "../components/canvas/PlanCanvas";
import { PlanImage } from "../components/canvas/PlanImage";
import { MaskImage } from "../components/canvas/MaskImage";
import { Piece, ROTATE_STEP_DEG } from "../components/canvas/Piece";
import { MaterialPanel } from "../components/canvas/MaterialPanel";
import { IsometricPreview } from "../components/common/IsometricPreview";
import { useElementSize } from "../hooks/useElementSize";
import { loadScenario } from "../lib/scenarios";
import { cmToPixels } from "../lib/scale";
import { loadProgress, saveProgress } from "../storage/progressStore";
import type { Material, PieceInstance, Scenario, Viewport } from "../types";

export function ScenarioView() {
  const { scenarioId = "" } = useParams();
  const { ref: containerRef, size } = useElementSize<HTMLDivElement>();
  const stageRef = useRef<Konva.Stage>(null);

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 });
  const [pieces, setPieces] = useState<PieceInstance[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setScenario(null);
    setError(null);

    loadScenario(scenarioId)
      .then(async (loaded) => {
        if (cancelled) return;
        setScenario(loaded);
        setViewport(loaded.initialViewport);
        const progress = await loadProgress(scenarioId);
        setPieces(progress?.pieces ?? []);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [scenarioId]);

  useEffect(() => {
    if (!scenario) return;
    saveProgress({ scenarioId, pieces, updatedAt: Date.now() });
  }, [scenario, scenarioId, pieces]);

  function handleAddMaterial(material: Material) {
    if (!scenario) return;
    const centerImageX = (size.width / 2 - viewport.x) / viewport.scale;
    const centerImageY = (size.height / 2 - viewport.y) / viewport.scale;
    const newPiece: PieceInstance = {
      id: uuid(),
      materialId: material.id,
      x: centerImageX,
      y: centerImageY,
      rotationDeg: 0,
      mirrored: false,
    };
    setPieces((prev) => [...prev, newPiece]);
    setSelectedId(newPiece.id);
  }

  function updatePiece(id: string, patch: Partial<PieceInstance>) {
    setPieces((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  }

  if (error) {
    return <div style={{ padding: 24, color: "#b91c1c" }}>{error}</div>;
  }

  if (!scenario) {
    return <div style={{ padding: 24 }}>Carregando cenário…</div>;
  }

  const materialById = new Map(scenario.materials.map((m) => [m.id, m]));

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height: "100vh" }}
    >
      {size.width > 0 && (
        <PlanCanvas
          width={size.width}
          height={size.height}
          viewport={viewport}
          onViewportChange={setViewport}
          onBackgroundClick={() => setSelectedId(null)}
          stageRef={stageRef}
        >
          <PlanImage src={scenario.planImageUrl} />
          {scenario.masks.map((mask) => (
            <MaskImage key={mask.id} mask={mask} />
          ))}
          {pieces.map((piece) => {
            const material = materialById.get(piece.materialId);
            if (!material) return null;
            const widthPx = cmToPixels(
              material.realWidthCm,
              scenario.scaleCalibration,
            );
            const heightPx = cmToPixels(
              material.realHeightCm,
              scenario.scaleCalibration,
            );
            return (
              <Piece
                key={piece.id}
                instance={piece}
                material={material}
                widthPx={widthPx}
                heightPx={heightPx}
                selected={piece.id === selectedId}
                inverseScale={1 / viewport.scale}
                onSelect={() => setSelectedId(piece.id)}
                onMove={(x, y) => updatePiece(piece.id, { x, y })}
                onRotate={() =>
                  updatePiece(piece.id, {
                    rotationDeg:
                      (piece.rotationDeg + ROTATE_STEP_DEG) % 360,
                  })
                }
                onMirror={() =>
                  updatePiece(piece.id, { mirrored: !piece.mirrored })
                }
              />
            );
          })}
        </PlanCanvas>
      )}

      <IsometricPreview src={scenario.isometricImageUrl} />
      <MaterialPanel materials={scenario.materials} onAdd={handleAddMaterial} />

      <button
        type="button"
        onClick={() => exportStagePng(stageRef.current)}
        style={{
          position: "absolute",
          bottom: 16,
          left: 16,
          padding: "8px 16px",
          borderRadius: 8,
          border: "1px solid #d1d5db",
          background: "white",
          cursor: "pointer",
        }}
      >
        Exportar PNG
      </button>
    </div>
  );
}

function exportStagePng(stage: Konva.Stage | null) {
  if (!stage) return;
  const dataUrl = stage.toDataURL({ pixelRatio: 2 });
  const link = document.createElement("a");
  link.download = "paginazilla-mosaico.png";
  link.href = dataUrl;
  link.click();
}
