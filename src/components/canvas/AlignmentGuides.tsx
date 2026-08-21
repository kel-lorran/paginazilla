import { Line } from "react-konva";
import type { Viewport } from "../../types";

interface AlignmentGuidesProps {
  guideX: number | null;
  guideY: number | null;
  viewport: Viewport;
  canvasWidth: number;
  canvasHeight: number;
  inverseScale: number;
}

export function AlignmentGuides({
  guideX,
  guideY,
  viewport,
  canvasWidth,
  canvasHeight,
  inverseScale,
}: AlignmentGuidesProps) {
  if (guideX == null && guideY == null) return null;

  const minX = -viewport.x / viewport.scale;
  const minY = -viewport.y / viewport.scale;
  const maxX = (canvasWidth - viewport.x) / viewport.scale;
  const maxY = (canvasHeight - viewport.y) / viewport.scale;

  return (
    <>
      {guideX != null && (
        <Line
          points={[guideX, minY, guideX, maxY]}
          stroke="#ec4899"
          strokeWidth={1.5 * inverseScale}
          dash={[5 * inverseScale, 4 * inverseScale]}
          listening={false}
        />
      )}
      {guideY != null && (
        <Line
          points={[minX, guideY, maxX, guideY]}
          stroke="#ec4899"
          strokeWidth={1.5 * inverseScale}
          dash={[5 * inverseScale, 4 * inverseScale]}
          listening={false}
        />
      )}
    </>
  );
}
