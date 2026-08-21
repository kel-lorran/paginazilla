import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useParams } from "react-router-dom";
import { v4 as uuid } from "uuid";
import type Konva from "konva";
import { PlanCanvas } from "../components/canvas/PlanCanvas";
import { PlanImage } from "../components/canvas/PlanImage";
import { MaskImage } from "../components/canvas/MaskImage";
import { PolygonMaskOverlay } from "../components/canvas/PolygonMaskOverlay";
import { Piece, ROTATE_STEP_DEG } from "../components/canvas/Piece";
import { GroupToolbar } from "../components/canvas/GroupToolbar";
import { GridOverlay } from "../components/canvas/GridOverlay";
import { AlignmentGuides } from "../components/canvas/AlignmentGuides";
import { MaterialPanel } from "../components/canvas/MaterialPanel";
import { IsometricPreview } from "../components/common/IsometricPreview";
import { useElementSize } from "../hooks/useElementSize";
import { loadScenario } from "../lib/scenarios";
import { cmToPixels } from "../lib/scale";
import { centerOf, reflectPointHorizontal, rotatePointAround } from "../lib/groupTransform";
import { snapToNeighbors, type PieceBox } from "../lib/alignmentGuides";
import { loadProgress, saveProgress } from "../storage/progressStore";
import type { Material, MosaicProgress, PieceInstance, Point, Scenario, Viewport } from "../types";

const SNAP_THRESHOLD_SCREEN_PX = 8;
const DEFAULT_GRID_SPACING_CM = 25;

export function ScenarioView() {
  const { scenarioId = "" } = useParams();
  const { ref: containerRef, size } = useElementSize<HTMLDivElement>();
  const stageRef = useRef<Konva.Stage>(null);

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 });
  const [pieces, setPieces] = useState<PieceInstance[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saveLabel, setSaveLabel] = useState("Salvar");
  const [gridEnabled, setGridEnabled] = useState(false);
  const [gridSpacingCm, setGridSpacingCm] = useState(DEFAULT_GRID_SPACING_CM);
  const [guides, setGuides] = useState<{ x: number | null; y: number | null }>({
    x: null,
    y: null,
  });

  const dragStartRef = useRef<Record<string, Point>>({});

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

  function buildProgressRecord(): MosaicProgress {
    return {
      scenarioId,
      title: scenario?.name ?? scenarioId,
      scenarioUrl: `/cenario/${scenarioId}`,
      planImageUrl: scenario?.planImageUrl,
      isometricImageUrl: scenario?.isometricImageUrl,
      pieces,
      updatedAt: Date.now(),
    };
  }

  useEffect(() => {
    if (!scenario) return;
    saveProgress(buildProgressRecord());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario, scenarioId, pieces]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.size > 0) {
        e.preventDefault();
        deletePieces(selectedIds);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds]);

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
    setSelectedIds(new Set([newPiece.id]));
  }

  function updatePiece(id: string, patch: Partial<PieceInstance>) {
    setPieces((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function deletePieces(ids: Set<string>) {
    setPieces((prev) => prev.filter((p) => !ids.has(p.id)));
    setSelectedIds(new Set());
  }

  function handleSelectPiece(id: string, shiftKey: boolean) {
    setSelectedIds((prev) => {
      if (shiftKey) {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }
      return new Set([id]);
    });
  }

  const gridSpacingPx = scenario ? cmToPixels(gridSpacingCm, scenario.scaleCalibration) : 0;
  const snapThresholdPx = SNAP_THRESHOLD_SCREEN_PX / viewport.scale;

  const materialById = scenario ? new Map(scenario.materials.map((m) => [m.id, m])) : new Map();

  function pieceBox(piece: PieceInstance): PieceBox | null {
    const material = materialById.get(piece.materialId);
    if (!material || !scenario) return null;
    const halfWidth = cmToPixels(material.realWidthCm, scenario.scaleCalibration) / 2;
    const halfHeight = cmToPixels(material.realHeightCm, scenario.scaleCalibration) / 2;
    return {
      id: piece.id,
      centerX: piece.x,
      centerY: piece.y,
      left: piece.x - halfWidth,
      right: piece.x + halfWidth,
      top: piece.y - halfHeight,
      bottom: piece.y + halfHeight,
    };
  }

  function handlePieceDragStart(pieceId: string) {
    if (!selectedIds.has(pieceId) || selectedIds.size <= 1) {
      dragStartRef.current = {};
      return;
    }
    const starts: Record<string, Point> = {};
    for (const id of selectedIds) {
      const p = pieces.find((pp) => pp.id === id);
      if (p) starts[id] = { x: p.x, y: p.y };
    }
    dragStartRef.current = starts;
  }

  /** Arraste de peça única: gruda no centro/borda de peças vizinhas (guias de alinhamento). */
  function snapSinglePiece(pieceId: string, x: number, y: number): Point {
    const dragged = pieces.find((p) => p.id === pieceId);
    const material = dragged ? materialById.get(dragged.materialId) : null;
    if (!dragged || !material || !scenario) return { x, y };

    const halfWidth = cmToPixels(material.realWidthCm, scenario.scaleCalibration) / 2;
    const halfHeight = cmToPixels(material.realHeightCm, scenario.scaleCalibration) / 2;
    const others = pieces
      .filter((p) => p.id !== pieceId)
      .map(pieceBox)
      .filter((b): b is PieceBox => b !== null);

    const result = snapToNeighbors({ x, y, halfWidth, halfHeight }, others, snapThresholdPx);
    setGuides({ x: result.guideX, y: result.guideY });
    return result.point;
  }

  function handlePieceDragMove(pieceId: string, x: number, y: number) {
    const starts = dragStartRef.current;
    const start = starts[pieceId];
    if (!start) return;
    const dx = x - start.x;
    const dy = y - start.y;
    setPieces((prev) =>
      prev.map((p) => {
        if (p.id === pieceId || !(p.id in starts)) return p;
        const s = starts[p.id];
        return { ...p, x: s.x + dx, y: s.y + dy };
      }),
    );
  }

  function handlePieceDragEnd(pieceId: string, x: number, y: number) {
    updatePiece(pieceId, { x, y });
    dragStartRef.current = {};
    setGuides({ x: null, y: null });
  }

  function selectedPieces(): PieceInstance[] {
    return pieces.filter((p) => selectedIds.has(p.id));
  }

  function handleGroupRotate() {
    const selected = selectedPieces();
    if (selected.length === 0) return;
    const center = centerOf(selected.map((p) => ({ x: p.x, y: p.y })));
    setPieces((prev) =>
      prev.map((p) => {
        if (!selectedIds.has(p.id)) return p;
        const rotated = rotatePointAround({ x: p.x, y: p.y }, center, ROTATE_STEP_DEG);
        return {
          ...p,
          x: rotated.x,
          y: rotated.y,
          rotationDeg: (p.rotationDeg + ROTATE_STEP_DEG) % 360,
        };
      }),
    );
  }

  function handleGroupMirror() {
    const selected = selectedPieces();
    if (selected.length === 0) return;
    const center = centerOf(selected.map((p) => ({ x: p.x, y: p.y })));
    setPieces((prev) =>
      prev.map((p) => {
        if (!selectedIds.has(p.id)) return p;
        const reflected = reflectPointHorizontal({ x: p.x, y: p.y }, center.x);
        return {
          ...p,
          x: reflected.x,
          rotationDeg: (360 - p.rotationDeg) % 360,
          mirrored: !p.mirrored,
        };
      }),
    );
  }

  function handleSaveClick() {
    saveProgress(buildProgressRecord());
    setSaveLabel("Salvo ✓");
    setTimeout(() => setSaveLabel("Salvar"), 1500);
  }

  async function handleLoadClick() {
    const progress = await loadProgress(scenarioId);
    if (!progress) {
      window.alert("Não há nenhuma versão salva desse cenário ainda.");
      return;
    }
    if (
      window.confirm(
        "Isso substitui as peças atuais na tela pela última versão salva. Continuar?",
      )
    ) {
      setPieces(progress.pieces);
      setSelectedIds(new Set());
    }
  }

  if (error) {
    return <div style={{ padding: 24, color: "#b91c1c" }}>{error}</div>;
  }

  if (!scenario) {
    return <div style={{ padding: 24 }}>Carregando cenário…</div>;
  }

  const selected = selectedPieces();
  const isGroupSelection = selected.length > 1;
  const groupAnchor = isGroupSelection
    ? centerOf(selected.map((p) => ({ x: p.x, y: p.y - 60 })))
    : null;

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
          onBackgroundClick={() => setSelectedIds(new Set())}
          stageRef={stageRef}
        >
          <PlanImage src={scenario.planImageUrl} />
          {scenario.masks.map((mask) =>
            mask.type === "polygon" ? (
              <PolygonMaskOverlay key={mask.id} points={mask.points} opacity={mask.opacity} />
            ) : (
              <MaskImage key={mask.id} mask={mask} />
            ),
          )}
          {gridEnabled && (
            <GridOverlay
              viewport={viewport}
              canvasWidth={size.width}
              canvasHeight={size.height}
              spacingPx={gridSpacingPx}
              inverseScale={1 / viewport.scale}
            />
          )}
          {pieces.map((piece) => {
            const material = materialById.get(piece.materialId);
            if (!material) return null;
            const widthPx = cmToPixels(material.realWidthCm, scenario.scaleCalibration);
            const heightPx = cmToPixels(material.realHeightCm, scenario.scaleCalibration);
            const isSelectedAlone = !isGroupSelection && selectedIds.has(piece.id);
            const isHighlighted = isGroupSelection && selectedIds.has(piece.id);
            return (
              <Piece
                key={piece.id}
                instance={piece}
                material={material}
                widthPx={widthPx}
                heightPx={heightPx}
                selected={isSelectedAlone}
                highlighted={isHighlighted}
                inverseScale={1 / viewport.scale}
                onSelect={(shiftKey) => handleSelectPiece(piece.id, shiftKey)}
                onDragStart={() => handlePieceDragStart(piece.id)}
                onDragMove={(x, y) => {
                  const isGroupDrag = piece.id in dragStartRef.current;
                  const snapped = isGroupDrag ? { x, y } : snapSinglePiece(piece.id, x, y);
                  handlePieceDragMove(piece.id, snapped.x, snapped.y);
                }}
                onDragEnd={(x, y) => {
                  const isGroupDrag = piece.id in dragStartRef.current;
                  const snapped = isGroupDrag ? { x, y } : snapSinglePiece(piece.id, x, y);
                  handlePieceDragEnd(piece.id, snapped.x, snapped.y);
                }}
                onRotate={() =>
                  updatePiece(piece.id, {
                    rotationDeg: (piece.rotationDeg + ROTATE_STEP_DEG) % 360,
                  })
                }
                onMirror={() => updatePiece(piece.id, { mirrored: !piece.mirrored })}
                onDelete={() => deletePieces(new Set([piece.id]))}
              />
            );
          })}
          <AlignmentGuides
            guideX={guides.x}
            guideY={guides.y}
            viewport={viewport}
            canvasWidth={size.width}
            canvasHeight={size.height}
            inverseScale={1 / viewport.scale}
          />
          {isGroupSelection && groupAnchor && (
            <GroupToolbar
              x={groupAnchor.x}
              y={groupAnchor.y}
              inverseScale={1 / viewport.scale}
              onRotate={handleGroupRotate}
              onMirror={handleGroupMirror}
              onDelete={() => deletePieces(selectedIds)}
            />
          )}
        </PlanCanvas>
      )}

      <IsometricPreview src={scenario.isometricImageUrl} />
      <MaterialPanel materials={scenario.materials} onAdd={handleAddMaterial} />

      <div
        style={{
          position: "absolute",
          top: 16,
          right: 236,
          background: "white",
          border: "1px solid #d1d5db",
          borderRadius: 8,
          padding: "8px 12px",
          fontSize: 12,
          color: "#374151",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input
            type="checkbox"
            checked={gridEnabled}
            onChange={(e) => setGridEnabled(e.target.checked)}
          />
          Grade
        </label>
        <input
          type="number"
          min={1}
          value={gridSpacingCm}
          onChange={(e) => setGridSpacingCm(Math.max(1, Number(e.target.value)))}
          style={{ width: 48, color: "#111827" }}
          disabled={!gridEnabled}
        />
        <span>cm</span>
      </div>

      <div style={{ position: "absolute", bottom: 16, left: 16, display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={() => exportStagePng(stageRef.current)}
          style={buttonStyle}
        >
          Exportar PNG
        </button>
        <button type="button" onClick={handleSaveClick} style={buttonStyle}>
          {saveLabel}
        </button>
        <button type="button" onClick={handleLoadClick} style={buttonStyle}>
          Carregar
        </button>
      </div>
    </div>
  );
}

const buttonStyle: CSSProperties = {
  padding: "8px 16px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  background: "white",
  color: "#111827",
  cursor: "pointer",
};

function exportStagePng(stage: Konva.Stage | null) {
  if (!stage) return;
  const dataUrl = stage.toDataURL({ pixelRatio: 2 });
  const link = document.createElement("a");
  link.download = "paginazilla-mosaico.png";
  link.href = dataUrl;
  link.click();
}
