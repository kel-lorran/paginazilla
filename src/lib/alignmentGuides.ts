import type { Point } from "../types";

export interface PieceBox {
  id: string;
  centerX: number;
  centerY: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface SnapResult {
  point: Point;
  guideX: number | null;
  guideY: number | null;
}

interface AxisMatch {
  diff: number;
  snappedValue: number;
  guide: number;
}

function bestAxisMatch(
  draggedCenter: number,
  draggedMin: number,
  draggedMax: number,
  otherCenter: number,
  otherMin: number,
  otherMax: number,
  thresholdPx: number,
  current: AxisMatch | null,
): AxisMatch | null {
  const candidates: [number, number][] = [
    [draggedCenter, otherCenter],
    [draggedMin, otherMin],
    [draggedMax, otherMax],
    [draggedMin, otherMax], // encosta a borda esquerda/topo na direita/base da outra peça
    [draggedMax, otherMin], // encosta a borda direita/base na esquerda/topo da outra peça
  ];
  let best = current;
  for (const [draggedValue, targetValue] of candidates) {
    const diff = Math.abs(draggedValue - targetValue);
    if (diff <= thresholdPx && (!best || diff < best.diff)) {
      const delta = targetValue - draggedValue;
      best = { diff, snappedValue: draggedCenter + delta, guide: targetValue };
    }
  }
  return best;
}

/**
 * Alinha a peça arrastada com o centro ou as bordas de outras peças próximas —
 * "guias de alinhamento" tipo Figma, em vez de um grid fixo. Permite formar
 * fileiras/colunas encostando peças lado a lado ou centralizando com vizinhas.
 */
export function snapToNeighbors(
  dragged: { x: number; y: number; halfWidth: number; halfHeight: number },
  others: PieceBox[],
  thresholdPx: number,
): SnapResult {
  const draggedLeft = dragged.x - dragged.halfWidth;
  const draggedRight = dragged.x + dragged.halfWidth;
  const draggedTop = dragged.y - dragged.halfHeight;
  const draggedBottom = dragged.y + dragged.halfHeight;

  let bestX: AxisMatch | null = null;
  let bestY: AxisMatch | null = null;

  for (const box of others) {
    bestX = bestAxisMatch(
      dragged.x,
      draggedLeft,
      draggedRight,
      box.centerX,
      box.left,
      box.right,
      thresholdPx,
      bestX,
    );
    bestY = bestAxisMatch(
      dragged.y,
      draggedTop,
      draggedBottom,
      box.centerY,
      box.top,
      box.bottom,
      thresholdPx,
      bestY,
    );
  }

  return {
    point: {
      x: bestX ? bestX.snappedValue : dragged.x,
      y: bestY ? bestY.snappedValue : dragged.y,
    },
    guideX: bestX ? bestX.guide : null,
    guideY: bestY ? bestY.guide : null,
  };
}
