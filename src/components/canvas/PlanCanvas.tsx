import { Stage, Layer, Rect } from "react-konva";
import type Konva from "konva";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import type { Point, Viewport } from "../../types";

const MIN_SCALE = 0.1;
const MAX_SCALE = 8;

function touchDistance(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

function touchCenter(p1: Point, p2: Point): Point {
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}

export interface SelectionRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface PlanCanvasProps {
  width: number;
  height: number;
  viewport: Viewport;
  onViewportChange: (viewport: Viewport) => void;
  /** Clique no fundo (fora de qualquer peça), já convertido pro espaço de coordenadas da planta. */
  onBackgroundClick?: (point: Point) => void;
  /** Shift + clique-e-arraste no fundo — janela de seleção, em coordenadas da planta. */
  onSelectionRectEnd?: (rect: SelectionRect) => void;
  stageRef: RefObject<Konva.Stage | null>;
  children: ReactNode;
  /** Renderizado numa camada separada, sempre por cima do conteúdo — contornos, toolbars, guias. */
  overlay?: ReactNode;
}

export function PlanCanvas({
  width,
  height,
  viewport,
  onViewportChange,
  onBackgroundClick,
  onSelectionRectEnd,
  stageRef,
  children,
  overlay,
}: PlanCanvasProps) {
  const [shiftHeld, setShiftHeld] = useState(false);
  const [selectionDrag, setSelectionDrag] = useState<{ start: Point; current: Point } | null>(
    null,
  );
  const pinchRef = useRef<{ lastCenter: Point | null; lastDist: number }>({
    lastCenter: null,
    lastDist: 0,
  });

  const selectionEnabled = Boolean(onSelectionRectEnd);

  useEffect(() => {
    if (!selectionEnabled) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Shift") setShiftHeld(true);
    }
    function handleKeyUp(e: KeyboardEvent) {
      if (e.key === "Shift") setShiftHeld(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [selectionEnabled]);

  function toImagePoint(pointer: { x: number; y: number }): Point {
    return {
      x: (pointer.x - viewport.x) / viewport.scale,
      y: (pointer.y - viewport.y) / viewport.scale,
    };
  }

  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const oldScale = viewport.scale;
    const mousePointTo = {
      x: (pointer.x - viewport.x) / oldScale,
      y: (pointer.y - viewport.y) / oldScale,
    };

    const zoomIntensity = 1.05;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale =
      direction > 0 ? oldScale * zoomIntensity : oldScale / zoomIntensity;
    const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));

    onViewportChange({
      scale: clampedScale,
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
  }

  function handleDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
    if (e.target !== stageRef.current) return;
    onViewportChange({ ...viewport, x: e.target.x(), y: e.target.y() });
  }

  function handleMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    if (e.target !== stageRef.current) return;
    const pointer = e.target.getPointerPosition();
    if (!pointer) return;
    const imagePoint = toImagePoint(pointer);

    if (shiftHeld && selectionEnabled) {
      setSelectionDrag({ start: imagePoint, current: imagePoint });
      return;
    }
    onBackgroundClick?.(imagePoint);
  }

  function handleMouseMove() {
    if (!selectionDrag) return;
    const stage = stageRef.current;
    const pointer = stage?.getPointerPosition();
    if (!pointer) return;
    setSelectionDrag((prev) => (prev ? { ...prev, current: toImagePoint(pointer) } : prev));
  }

  function handleMouseUp() {
    if (!selectionDrag) return;
    const { start, current } = selectionDrag;
    setSelectionDrag(null);
    onSelectionRectEnd?.({
      x1: Math.min(start.x, current.x),
      y1: Math.min(start.y, current.y),
      x2: Math.max(start.x, current.x),
      y2: Math.max(start.y, current.y),
    });
  }

  /**
   * Pinça de dois dedos pra zoom + pan simultâneo, só em touch — não afeta
   * mouse/desktop. Mexe direto no node do Konva (sem passar pelo estado do
   * React a cada frame) e só sincroniza no fim do gesto — do contrário cada
   * toque re-renderiza a árvore inteira e o gesto fica travado.
   */
  function handleTouchMove(e: Konva.KonvaEventObject<TouchEvent>) {
    const touch1 = e.evt.touches[0];
    const touch2 = e.evt.touches[1];
    const stage = stageRef.current;
    if (!touch1 || !touch2 || !stage) return;

    e.evt.preventDefault();
    if (stage.isDragging()) stage.stopDrag();

    const p1 = { x: touch1.clientX, y: touch1.clientY };
    const p2 = { x: touch2.clientX, y: touch2.clientY };
    const pinch = pinchRef.current;

    if (!pinch.lastCenter) {
      pinch.lastCenter = touchCenter(p1, p2);
      pinch.lastDist = touchDistance(p1, p2);
      return;
    }

    const newCenter = touchCenter(p1, p2);
    const dist = touchDistance(p1, p2);
    const oldScale = stage.scaleX();
    const pointTo = {
      x: (newCenter.x - stage.x()) / oldScale,
      y: (newCenter.y - stage.y()) / oldScale,
    };
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, oldScale * (dist / pinch.lastDist)));
    const dx = newCenter.x - pinch.lastCenter.x;
    const dy = newCenter.y - pinch.lastCenter.y;

    stage.scale({ x: newScale, y: newScale });
    stage.position({
      x: newCenter.x - pointTo.x * newScale + dx,
      y: newCenter.y - pointTo.y * newScale + dy,
    });
    stage.batchDraw();

    pinch.lastDist = dist;
    pinch.lastCenter = newCenter;
  }

  function handleTouchEnd() {
    const stage = stageRef.current;
    if (pinchRef.current.lastCenter && stage) {
      // gesto terminou — só agora sincroniza o estado do React com o resultado final
      onViewportChange({ scale: stage.scaleX(), x: stage.x(), y: stage.y() });
    }
    pinchRef.current = { lastCenter: null, lastDist: 0 };
  }

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      x={viewport.x}
      y={viewport.y}
      scaleX={viewport.scale}
      scaleY={viewport.scale}
      draggable={!(shiftHeld && selectionEnabled)}
      onWheel={handleWheel}
      onDragEnd={handleDragEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <Layer>{children}</Layer>
      <Layer>
        {overlay}
        {selectionDrag && (
          <Rect
            x={Math.min(selectionDrag.start.x, selectionDrag.current.x)}
            y={Math.min(selectionDrag.start.y, selectionDrag.current.y)}
            width={Math.abs(selectionDrag.current.x - selectionDrag.start.x)}
            height={Math.abs(selectionDrag.current.y - selectionDrag.start.y)}
            fill="rgba(37, 99, 235, 0.1)"
            stroke="#2563eb"
            strokeWidth={1 / viewport.scale}
            listening={false}
          />
        )}
      </Layer>
    </Stage>
  );
}
