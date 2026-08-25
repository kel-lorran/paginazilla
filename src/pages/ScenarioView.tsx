import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from "react";
import { useParams } from "react-router-dom";
import { v4 as uuid } from "uuid";
import type Konva from "konva";
import { PlanCanvas } from "../components/canvas/PlanCanvas";
import { PlanImage } from "../components/canvas/PlanImage";
import { MaskImage } from "../components/canvas/MaskImage";
import { PolygonMaskOverlay } from "../components/canvas/PolygonMaskOverlay";
import { Piece, ROTATE_STEP_DEG } from "../components/canvas/Piece";
import { PieceOutline } from "../components/canvas/PieceOutline";
import { GroupToolbar } from "../components/canvas/GroupToolbar";
import { GridOverlay } from "../components/canvas/GridOverlay";
import { AlignmentGuides } from "../components/canvas/AlignmentGuides";
import { MaterialPanel } from "../components/canvas/MaterialPanel";
import { IsometricPreview } from "../components/common/IsometricPreview";
import { TutorialModal, TutorialHelpButton } from "../components/tutorial/TutorialModal";
import { MaterialSheet } from "../components/mobile/MaterialSheet";
import { MobileActionBar } from "../components/mobile/MobileActionBar";
import { MobileDpad } from "../components/mobile/MobileDpad";
import { ZoomControl } from "../components/mobile/ZoomControl";
import { scenarioTutorialTips } from "../data/tutorialTips";
import { useElementSize } from "../hooks/useElementSize";
import { useIsMobileLayout } from "../hooks/useIsMobileLayout";
import { loadScenario } from "../lib/scenarios";
import { cmToPixels } from "../lib/scale";
import { centerOf, reflectPointHorizontal, rotatePointAround } from "../lib/groupTransform";
import { snapToNeighbors, type PieceBox } from "../lib/alignmentGuides";
import { loadProgress, saveProgress } from "../storage/progressStore";
import { loadViewState, saveViewState } from "../lib/viewState";
import type { Material, MosaicProgress, PieceInstance, Point, Scenario, Viewport } from "../types";

const SNAP_THRESHOLD_SCREEN_PX = 8;
const DEFAULT_GRID_SPACING_CM = 25;
const ARROW_STEP_FINE_CM = 0.1;
const ARROW_STEP_COARSE_CM = 1;
const DUPLICATE_OFFSET_CM = 5;
const FINE_ROTATE_STEP_DEG = 5;
const MAX_HISTORY = 50;

const normalizeDeg = (deg: number) => ((deg % 360) + 360) % 360;

function cloneWithOffset(source: PieceInstance[], offsetPx: number): PieceInstance[] {
  return source.map((p) => ({
    id: uuid(),
    materialId: p.materialId,
    x: p.x + offsetPx,
    y: p.y + offsetPx,
    rotationDeg: p.rotationDeg,
    mirrored: p.mirrored,
  }));
}

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
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const isMobileLayout = useIsMobileLayout();

  const dragStartRef = useRef<Record<string, Point>>({});
  const loadInputRef = useRef<HTMLInputElement>(null);
  const piecesRef = useRef<PieceInstance[]>(pieces);
  const clipboardRef = useRef<PieceInstance[]>([]);
  const pasteCountRef = useRef(0);
  const undoStackRef = useRef<PieceInstance[][]>([]);
  const redoStackRef = useRef<PieceInstance[][]>([]);
  const [, setHistoryTick] = useState(0);

  useEffect(() => {
    piecesRef.current = pieces;
  }, [pieces]);

  /** Chame antes de qualquer setPieces que deva virar um passo de desfazer. */
  function pushHistory() {
    undoStackRef.current.push(piecesRef.current);
    if (undoStackRef.current.length > MAX_HISTORY) undoStackRef.current.shift();
    redoStackRef.current = [];
    setHistoryTick((t) => t + 1);
  }

  function undo() {
    if (undoStackRef.current.length === 0) return;
    const previous = undoStackRef.current.pop()!;
    redoStackRef.current.push(piecesRef.current);
    setPieces(previous);
    setSelectedIds(new Set());
    setHistoryTick((t) => t + 1);
  }

  function redo() {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current.pop()!;
    undoStackRef.current.push(piecesRef.current);
    setPieces(next);
    setSelectedIds(new Set());
    setHistoryTick((t) => t + 1);
  }

  useEffect(() => {
    let cancelled = false;
    setScenario(null);
    setError(null);

    loadScenario(scenarioId)
      .then(async (loaded) => {
        if (cancelled) return;
        setScenario(loaded);
        const savedView = loadViewState(scenarioId);
        setViewport(savedView?.viewport ?? loaded.initialViewport);
        setGridEnabled(savedView?.gridEnabled ?? false);
        setGridSpacingCm(savedView?.gridSpacingCm ?? DEFAULT_GRID_SPACING_CM);
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
    saveViewState(scenarioId, { viewport, gridEnabled, gridSpacingCm });
  }, [scenario, scenarioId, viewport, gridEnabled, gridSpacingCm]);

  useEffect(() => {
    try {
      if (!localStorage.getItem("paginazilla:tutorial-seen")) {
        setTutorialOpen(true);
        localStorage.setItem("paginazilla:tutorial-seen", "1");
      }
    } catch {
      // localStorage indisponível (ex: navegação privada) — só não mostra automático
    }
  }, []);

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

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (isCtrlOrCmd && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.size > 0) {
        e.preventDefault();
        deletePieces(selectedIds);
        return;
      }

      if ((e.key === "," || e.key === ".") && selectedIds.size > 0) {
        e.preventDefault();
        rotateSelectionBy(e.key === "," ? -FINE_ROTATE_STEP_DEG : FINE_ROTATE_STEP_DEG);
        return;
      }

      const arrowDeltas: Record<string, Point> = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
      };
      const arrowDelta = arrowDeltas[e.key];
      if (arrowDelta && selectedIds.size > 0 && scenario) {
        e.preventDefault();
        const stepCm = e.shiftKey ? ARROW_STEP_COARSE_CM : ARROW_STEP_FINE_CM;
        nudgeSelection(arrowDelta.x, arrowDelta.y, stepCm);
        return;
      }

      if (isCtrlOrCmd && e.key.toLowerCase() === "c" && selectedIds.size > 0) {
        e.preventDefault();
        clipboardRef.current = piecesRef.current.filter((p) => selectedIds.has(p.id));
        pasteCountRef.current = 0;
        return;
      }
      if (isCtrlOrCmd && e.key.toLowerCase() === "v" && scenario) {
        if (clipboardRef.current.length === 0) return;
        e.preventDefault();
        pasteCountRef.current += 1;
        const offsetPx = cmToPixels(
          DUPLICATE_OFFSET_CM * pasteCountRef.current,
          scenario.scaleCalibration,
        );
        const clones = cloneWithOffset(clipboardRef.current, offsetPx);
        pushHistory();
        setPieces((prev) => [...prev, ...clones]);
        setSelectedIds(new Set(clones.map((c) => c.id)));
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, scenario]);

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
    pushHistory();
    setPieces((prev) => [...prev, newPiece]);
    setSelectedIds(new Set([newPiece.id]));
  }

  function updatePiece(id: string, patch: Partial<PieceInstance>) {
    pushHistory();
    setPieces((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function deletePieces(ids: Set<string>) {
    pushHistory();
    setPieces((prev) => prev.filter((p) => !ids.has(p.id)));
    setSelectedIds(new Set());
  }

  /** Nudge por teclado (setas) ou pela cruz mobile — mesmo passo, mesma seleção. */
  function nudgeSelection(dirX: number, dirY: number, stepCm: number) {
    if (selectedIds.size === 0 || !scenario) return;
    pushHistory();
    const stepPx = cmToPixels(stepCm, scenario.scaleCalibration);
    const dx = dirX * stepPx;
    const dy = dirY * stepPx;
    setPieces((prev) =>
      prev.map((p) => (selectedIds.has(p.id) ? { ...p, x: p.x + dx, y: p.y + dy } : p)),
    );
  }

  /** Gira a seleção sem registrar histórico — usada tick a tick pelo anel de arraste mobile,
   * que já empurra um único snapshot no início do gesto (onRotateStart). */
  function applyRotationDelta(deltaDeg: number) {
    if (selectedIds.size === 0) return;
    const selected = piecesRef.current.filter((p) => selectedIds.has(p.id));
    if (selected.length === 0) return;
    const center = centerOf(selected.map((p) => ({ x: p.x, y: p.y })));
    setPieces((prev) =>
      prev.map((p) => {
        if (!selectedIds.has(p.id)) return p;
        const rotated = rotatePointAround({ x: p.x, y: p.y }, center, deltaDeg);
        return { ...p, x: rotated.x, y: rotated.y, rotationDeg: normalizeDeg(p.rotationDeg + deltaDeg) };
      }),
    );
  }

  /** Girar por um passo discreto (botão, atalho de vírgula/ponto) — um único passo de histórico. */
  function rotateSelectionBy(deltaDeg: number) {
    if (selectedIds.size === 0) return;
    pushHistory();
    applyRotationDelta(deltaDeg);
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

  /** Shift + arrastar no fundo: soma à seleção atual toda peça que a janela tocar. */
  function handleSelectionRectEnd(rect: { x1: number; y1: number; x2: number; y2: number }) {
    const matchedIds = pieces
      .map(pieceBox)
      .filter((b): b is PieceBox => b !== null)
      .filter((b) => b.left <= rect.x2 && b.right >= rect.x1 && b.top <= rect.y2 && b.bottom >= rect.y1)
      .map((b) => b.id);
    if (matchedIds.length === 0) return;
    setSelectedIds((prev) => new Set([...prev, ...matchedIds]));
  }

  function handlePieceDragStart(pieceId: string) {
    pushHistory();
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
    // Não usa updatePiece aqui de propósito: o histórico já foi empurrado em
    // handlePieceDragStart (início do gesto), então isto só commita a posição final.
    setPieces((prev) => prev.map((p) => (p.id === pieceId ? { ...p, x, y } : p)));
    dragStartRef.current = {};
    setGuides({ x: null, y: null });
  }

  function selectedPieces(): PieceInstance[] {
    return pieces.filter((p) => selectedIds.has(p.id));
  }

  /** Gira em torno do centro da seleção — pra uma peça só, isso equivale a girar em torno dela mesma. */
  function handleGroupRotate() {
    rotateSelectionBy(ROTATE_STEP_DEG);
  }

  function handleGroupMirror() {
    const selected = selectedPieces();
    if (selected.length === 0) return;
    pushHistory();
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

  /** Barra de ações mobile — rotação usa a mesma regra de peça única/grupo do botão de desktop. */
  function handleMobileRotate() {
    rotateSelectionBy(ROTATE_STEP_DEG);
  }

  function handleMobileMirror() {
    const selected = selectedPieces();
    if (selected.length === 1) {
      const piece = selected[0];
      updatePiece(piece.id, { mirrored: !piece.mirrored });
    } else {
      handleGroupMirror();
    }
  }

  function handleDuplicateSelected() {
    const source = selectedPieces();
    if (source.length === 0 || !scenario) return;
    const offsetPx = cmToPixels(DUPLICATE_OFFSET_CM, scenario.scaleCalibration);
    const clones = cloneWithOffset(source, offsetPx);
    pushHistory();
    setPieces((prev) => [...prev, ...clones]);
    setSelectedIds(new Set(clones.map((c) => c.id)));
  }

  /** Baixa um .json com o mosaico atual — portável, independe do navegador/dispositivo. */
  function handleSaveClick() {
    const record = buildProgressRecord();
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `paginazilla-${scenarioId}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setSaveLabel("Salvo ✓");
    setTimeout(() => setSaveLabel("Salvar"), 1500);
  }

  function handleLoadClick() {
    loadInputRef.current?.click();
  }

  async function handleLoadFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    let data: Partial<MosaicProgress>;
    try {
      data = JSON.parse(await file.text());
    } catch {
      window.alert("Não consegui ler esse arquivo — confirme que é um .json exportado pelo Paginazilla.");
      return;
    }
    if (!Array.isArray(data.pieces)) {
      window.alert("Arquivo inválido: não parece um mosaico salvo do Paginazilla.");
      return;
    }

    if (data.scenarioId && data.scenarioId !== scenarioId) {
      const proceed = window.confirm(
        `Esse arquivo foi salvo do cenário "${data.title ?? data.scenarioId}", não deste ("${scenario?.name ?? scenarioId}"). As peças podem não corresponder aos materiais daqui. Carregar mesmo assim?`,
      );
      if (!proceed) return;
    } else if (
      !window.confirm("Isso substitui as peças atuais na tela pelas do arquivo. Continuar?")
    ) {
      return;
    }

    pushHistory();
    setPieces(data.pieces as PieceInstance[]);
    setSelectedIds(new Set());
  }

  if (error) {
    return <div style={{ padding: 24, color: "#b91c1c" }}>{error}</div>;
  }

  if (!scenario) {
    return <div style={{ padding: 24 }}>Carregando cenário…</div>;
  }

  const selected = selectedPieces();
  const isGroupSelection = selected.length > 1;
  const showMobileActionBar = isMobileLayout && selected.length > 0;
  const canUndo = undoStackRef.current.length > 0;
  const canRedo = redoStackRef.current.length > 0;
  const selectedBoxes = selected.map(pieceBox).filter((b): b is PieceBox => b !== null);
  // Ancora no topo da bounding box da seleção (não no centroide) — em seleções
  // espalhadas ou com "buracos", o centroide pode cair longe de qualquer peça.
  const groupAnchor =
    isGroupSelection && selectedBoxes.length > 0
      ? {
          x: (Math.min(...selectedBoxes.map((b) => b.left)) + Math.max(...selectedBoxes.map((b) => b.right))) / 2,
          y: Math.min(...selectedBoxes.map((b) => b.top)) - 40 / viewport.scale,
        }
      : null;

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height: "100dvh" }}
    >
      {size.width > 0 && (
        <PlanCanvas
          width={size.width}
          height={size.height}
          viewport={viewport}
          onViewportChange={setViewport}
          onBackgroundClick={() => setSelectedIds(new Set())}
          onSelectionRectEnd={handleSelectionRectEnd}
          stageRef={stageRef}
          overlay={
            <>
              <AlignmentGuides
                guideX={guides.x}
                guideY={guides.y}
                viewport={viewport}
                canvasWidth={size.width}
                canvasHeight={size.height}
                inverseScale={1 / viewport.scale}
              />
              {pieces.map((piece) => {
                if (!selectedIds.has(piece.id)) return null;
                const material = materialById.get(piece.materialId);
                if (!material) return null;
                const widthPx = cmToPixels(material.realWidthCm, scenario.scaleCalibration);
                const heightPx = cmToPixels(material.realHeightCm, scenario.scaleCalibration);
                return (
                  <PieceOutline
                    key={piece.id}
                    instance={piece}
                    widthPx={widthPx}
                    heightPx={heightPx}
                    showToolbar={!isGroupSelection && !isMobileLayout}
                    inverseScale={1 / viewport.scale}
                    onRotate={() => rotateSelectionBy(ROTATE_STEP_DEG)}
                    onMirror={() => updatePiece(piece.id, { mirrored: !piece.mirrored })}
                    onDuplicate={handleDuplicateSelected}
                    onDelete={() => deletePieces(new Set([piece.id]))}
                  />
                );
              })}
              {isGroupSelection && groupAnchor && !isMobileLayout && (
                <GroupToolbar
                  x={groupAnchor.x}
                  y={groupAnchor.y}
                  inverseScale={1 / viewport.scale}
                  onRotate={handleGroupRotate}
                  onMirror={handleGroupMirror}
                  onDuplicate={handleDuplicateSelected}
                  onDelete={() => deletePieces(selectedIds)}
                />
              )}
            </>
          }
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
            return (
              <Piece
                key={piece.id}
                instance={piece}
                material={material}
                widthPx={widthPx}
                heightPx={heightPx}
                onSelect={(shiftKey) => handleSelectPiece(piece.id, shiftKey || multiSelectMode)}
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
              />
            );
          })}
        </PlanCanvas>
      )}

      {!isMobileLayout && <IsometricPreview src={scenario.isometricImageUrl} />}

      {isMobileLayout && (
        <button
          type="button"
          onClick={() => setMultiSelectMode((v) => !v)}
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 12px",
            borderRadius: 999,
            border: `1px solid ${multiSelectMode ? "#2563eb" : "#d1d5db"}`,
            background: multiSelectMode ? "#eff6ff" : "white",
            color: multiSelectMode ? "#2563eb" : "#374151",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: multiSelectMode ? "#2563eb" : "#9ca3af",
            }}
          />
          Selecionar várias
        </button>
      )}

      {!isMobileLayout && <MaterialPanel materials={scenario.materials} onAdd={handleAddMaterial} />}

      <div
        style={{
          position: "absolute",
          top: 16,
          right: isMobileLayout ? 12 : 236,
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

      {isMobileLayout && (
        <ZoomControl
          viewport={viewport}
          onViewportChange={setViewport}
          canvasWidth={size.width}
          canvasHeight={size.height}
          style={{ top: 68, right: 12 }}
        />
      )}

      {showMobileActionBar && (
        <MobileDpad
          onNudge={(dx, dy) => nudgeSelection(dx, dy, ARROW_STEP_FINE_CM)}
          onRotateStart={pushHistory}
          onRotateDelta={applyRotationDelta}
          style={{ position: "absolute", right: 12, bottom: "calc(84px + env(safe-area-inset-bottom, 0px))" }}
        />
      )}

      {!isMobileLayout && (
        <div style={{ position: "absolute", bottom: 16, left: 16, display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            title="Desfazer (Ctrl+Z)"
            aria-label="Desfazer"
            style={{ ...buttonStyle, opacity: canUndo ? 1 : 0.4, cursor: canUndo ? "pointer" : "default" }}
          >
            ↶
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            title="Refazer (Ctrl+Shift+Z)"
            aria-label="Refazer"
            style={{ ...buttonStyle, opacity: canRedo ? 1 : 0.4, cursor: canRedo ? "pointer" : "default" }}
          >
            ↷
          </button>
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
      )}

      {isMobileLayout && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {!showMobileActionBar && (
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                padding: "0 16px 10px",
              }}
            >
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
          )}

          {showMobileActionBar ? (
            <MobileActionBar
              onUndo={undo}
              onRedo={redo}
              canUndo={canUndo}
              canRedo={canRedo}
              onRotate={handleMobileRotate}
              onMirror={handleMobileMirror}
              onDuplicate={handleDuplicateSelected}
              onDelete={() => deletePieces(selectedIds)}
            />
          ) : (
            <MaterialSheet materials={scenario.materials} onAdd={handleAddMaterial} />
          )}
        </div>
      )}

      <input
        ref={loadInputRef}
        type="file"
        accept="application/json"
        style={{ display: "none" }}
        onChange={handleLoadFileSelected}
      />

      {!isMobileLayout && <TutorialHelpButton onClick={() => setTutorialOpen(true)} />}
      {tutorialOpen && (
        <TutorialModal tips={scenarioTutorialTips} onClose={() => setTutorialOpen(false)} />
      )}
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
