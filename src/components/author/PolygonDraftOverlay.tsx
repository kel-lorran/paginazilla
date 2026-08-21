import { Circle, Line } from "react-konva";
import type { Point } from "../../types";

interface PolygonDraftOverlayProps {
  points: Point[];
  inverseScale: number;
}

export function PolygonDraftOverlay({ points, inverseScale }: PolygonDraftOverlayProps) {
  if (points.length === 0) return null;

  const flat = points.flatMap((p) => [p.x, p.y]);

  return (
    <>
      <Line
        points={flat}
        stroke="#2563eb"
        strokeWidth={2 * inverseScale}
        dash={[8 * inverseScale, 4 * inverseScale]}
        listening={false}
      />
      {points.map((p, i) => (
        <Circle
          key={i}
          x={p.x}
          y={p.y}
          radius={5 * inverseScale}
          fill={i === 0 ? "#16a34a" : "#2563eb"}
          listening={false}
        />
      ))}
    </>
  );
}
