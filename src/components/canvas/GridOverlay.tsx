import { Line } from "react-konva";
import type { Viewport } from "../../types";

interface GridOverlayProps {
  viewport: Viewport;
  canvasWidth: number;
  canvasHeight: number;
  spacingPx: number;
  inverseScale: number;
}

const MAX_LINES = 400;

export function GridOverlay({
  viewport,
  canvasWidth,
  canvasHeight,
  spacingPx,
  inverseScale,
}: GridOverlayProps) {
  if (spacingPx <= 0) return null;

  const minX = -viewport.x / viewport.scale;
  const minY = -viewport.y / viewport.scale;
  const maxX = (canvasWidth - viewport.x) / viewport.scale;
  const maxY = (canvasHeight - viewport.y) / viewport.scale;

  const colCount = Math.ceil((maxX - minX) / spacingPx);
  const rowCount = Math.ceil((maxY - minY) / spacingPx);
  if (colCount + rowCount > MAX_LINES) return null;

  const firstCol = Math.floor(minX / spacingPx) * spacingPx;
  const firstRow = Math.floor(minY / spacingPx) * spacingPx;

  const lines = [];
  for (let x = firstCol; x <= maxX; x += spacingPx) {
    lines.push(
      <Line
        key={`v${x}`}
        points={[x, minY, x, maxY]}
        stroke="#94a3b8"
        strokeWidth={inverseScale}
        opacity={0.4}
        listening={false}
      />,
    );
  }
  for (let y = firstRow; y <= maxY; y += spacingPx) {
    lines.push(
      <Line
        key={`h${y}`}
        points={[minX, y, maxX, y]}
        stroke="#94a3b8"
        strokeWidth={inverseScale}
        opacity={0.4}
        listening={false}
      />,
    );
  }

  return <>{lines}</>;
}
