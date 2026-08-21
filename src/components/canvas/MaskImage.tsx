import { Image as KonvaImage } from "react-konva";
import useImage from "use-image";
import type { MaskLayer } from "../../types";

export function MaskImage({ mask }: { mask: MaskLayer }) {
  const [image] = useImage(mask.imageUrl);
  if (!image) return null;
  return (
    <KonvaImage
      image={image}
      x={mask.x}
      y={mask.y}
      opacity={mask.opacity}
      listening={false}
    />
  );
}
