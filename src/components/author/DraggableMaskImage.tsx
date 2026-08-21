import { Image as KonvaImage } from "react-konva";
import type Konva from "konva";
import { useLuminanceMaskImage } from "../../hooks/useLuminanceMaskImage";
import type { DraftMask } from "../../state/authorStore";

interface DraggableMaskImageProps {
  mask: DraftMask;
  onMove: (x: number, y: number) => void;
}

export function DraggableMaskImage({ mask, onMove }: DraggableMaskImageProps) {
  const canvas = useLuminanceMaskImage(mask.previewUrl, { featherPx: mask.featherPx });
  if (!canvas) return null;

  function handleDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
    onMove(e.target.x(), e.target.y());
  }

  return (
    <KonvaImage
      image={canvas}
      x={mask.x}
      y={mask.y}
      opacity={mask.opacity}
      draggable
      onDragEnd={handleDragEnd}
    />
  );
}
