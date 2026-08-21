import { Stage, Layer } from "react-konva";
import type Konva from "konva";
import type { ReactNode, RefObject } from "react";
import type { Viewport } from "../../types";

const MIN_SCALE = 0.1;
const MAX_SCALE = 8;

interface PlanCanvasProps {
  width: number;
  height: number;
  viewport: Viewport;
  onViewportChange: (viewport: Viewport) => void;
  onBackgroundClick?: () => void;
  stageRef: RefObject<Konva.Stage | null>;
  children: ReactNode;
}

export function PlanCanvas({
  width,
  height,
  viewport,
  onViewportChange,
  onBackgroundClick,
  stageRef,
  children,
}: PlanCanvasProps) {
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

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      x={viewport.x}
      y={viewport.y}
      scaleX={viewport.scale}
      scaleY={viewport.scale}
      draggable
      onWheel={handleWheel}
      onDragEnd={handleDragEnd}
      onMouseDown={(e) => {
        if (e.target === stageRef.current) onBackgroundClick?.();
      }}
    >
      <Layer>{children}</Layer>
    </Stage>
  );
}
