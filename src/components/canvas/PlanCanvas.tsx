import { Stage, Layer, Rect } from "react-konva";
import type Konva from "konva";
import { useEffect, useState, type ReactNode, type RefObject } from "react";
import type { Point, Viewport } from "../../types";

const MIN_SCALE = 0.1;
const MAX_SCALE = 8;

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

  const selectionEnabled = Boolean(onSelectionRectEnd);

  useEffect(() => {
    const container = stageRef.current?.container();
    if (container) container.style.touchAction = "none";
  }, [stageRef]);

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
