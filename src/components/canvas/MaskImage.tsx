import { Image as KonvaImage } from "react-konva";
import { useLuminanceMaskImage } from "../../hooks/useLuminanceMaskImage";
import type { ImageMaskLayer } from "../../types";

export function MaskImage({ mask }: { mask: ImageMaskLayer }) {
  const canvas = useLuminanceMaskImage(mask.imageUrl, { featherPx: mask.featherPx });
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
