import { Shape } from "react-konva";
import type { Point } from "../../types";

interface PolygonMaskOverlayProps {
  points: Point[];
  opacity: number;
  color?: string;
}

/** Bem maior que qualquer planta razoável, pra cobrir a área visível em qualquer zoom/pan. */
const BOUNDS = 20000;
const DEFAULT_COLOR = "#000000";

export function PolygonMaskOverlay({ points, opacity, color = DEFAULT_COLOR }: PolygonMaskOverlayProps) {
  if (points.length < 3) return null;

  return (
    <Shape
      opacity={opacity}
      listening={false}
      sceneFunc={(ctx) => {
        ctx.beginPath();
        ctx.rect(-BOUNDS, -BOUNDS, BOUNDS * 2, BOUNDS * 2);
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = color;
        // evenodd faz o polígono virar um "furo" no retângulo grande — só a área
        // fora do polígono recebe a cor de esmaecimento.
        ctx.fill("evenodd");
      }}
    />
  );
}
