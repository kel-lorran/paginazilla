import { Image as KonvaImage } from "react-konva";
import { useLuminanceMaskImage } from "../../hooks/useLuminanceMaskImage";
import type { MaskLayer } from "../../types";

export function MaskImage({ mask }: { mask: MaskLayer }) {
  const canvas = useLuminanceMaskImage(mask.imageUrl);
  if (!canvas) return null;
  return (
    <KonvaImage
      image={canvas}
      x={mask.x}
      y={mask.y}
      opacity={mask.opacity}
      listening={false}
    />
  );
}
