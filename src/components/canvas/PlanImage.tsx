import { Image as KonvaImage } from "react-konva";
import useImage from "use-image";

interface PlanImageProps {
  src: string;
  opacity?: number;
}

export function PlanImage({ src, opacity = 1 }: PlanImageProps) {
  const [image] = useImage(src);
  if (!image) return null;
  return <KonvaImage image={image} opacity={opacity} listening={false} />;
}
