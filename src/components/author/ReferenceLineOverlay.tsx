import { Circle, Line } from "react-konva";
import type { Point } from "../../types";

interface ReferenceLineOverlayProps {
  points: Point[];
  inverseScale: number;
}

export function ReferenceLineOverlay({ points, inverseScale }: ReferenceLineOverlayProps) {
  if (points.length === 0) return null;

  return (
    <>
      {points.length === 2 && (
        <Line
          points={[points[0].x, points[0].y, points[1].x, points[1].y]}
          stroke="#dc2626"
          strokeWidth={2 * inverseScale}
          dash={[8 * inverseScale, 4 * inverseScale]}
          listening={false}
        />
      )}
      {points.map((p, i) => (
        <Circle
          key={i}
          x={p.x}
          y={p.y}
          radius={5 * inverseScale}
          fill="#dc2626"
          listening={false}
        />
      ))}
    </>
  );
}
