import type { Point } from "../types";

export function rotatePointAround(point: Point, center: Point, angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

export function reflectPointHorizontal(point: Point, centerX: number): Point {
  return { x: 2 * centerX - point.x, y: point.y };
}

export function centerOf(points: Point[]): Point {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), {
    x: 0,
    y: 0,
  });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

/** Arredonda pro múltiplo de `gridSize` mais próximo, só se estiver a até `thresholdPx` de distância — cria o efeito "magnético". */
export function snapValue(value: number, gridSize: number, thresholdPx: number): number {
  if (gridSize <= 0) return value;
  const nearest = Math.round(value / gridSize) * gridSize;
  return Math.abs(nearest - value) <= thresholdPx ? nearest : value;
}
