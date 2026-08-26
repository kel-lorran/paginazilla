import { Group, Rect } from "react-konva";
import { ToolbarButton } from "./Piece";
import type { PieceInstance } from "../../types";

interface PieceOutlineProps {
  instance: PieceInstance;
  widthPx: number;
  heightPx: number;
  /** Só peça selecionada sozinha mostra a toolbar; parte de um grupo mostra só o contorno. */
  showToolbar: boolean;
  inverseScale: number;
  onRotate: () => void;
  onMirror: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

/**
 * Contorno tracejado + toolbar de uma peça selecionada, renderizado numa
 * camada Konva separada da peça em si — garante que fica sempre por cima,
 * mesmo quando outra peça vizinha é desenhada depois dela.
 */
export function PieceOutline({
  instance,
  widthPx,
  heightPx,
  showToolbar,
  inverseScale,
  onRotate,
  onMirror,
  onDuplicate,
  onDelete,
}: PieceOutlineProps) {
  const halfW = widthPx / 2;
  const halfH = heightPx / 2;
  const rad = (instance.rotationDeg * Math.PI) / 180;
  // Topo da caixa já rotacionada, no espaço da planta — mantém a toolbar acima
  // da peça mesmo com bastante rotação aplicada (antes ela girava junto do
  // contorno e podia acabar sobreposta à própria peça).
  const topOffsetY = -(halfW * Math.abs(Math.sin(rad)) + halfH * Math.abs(Math.cos(rad)));

  return (
    <>
      <Group x={instance.x} y={instance.y} rotation={instance.rotationDeg}>
        <Rect
          width={widthPx}
          height={heightPx}
          offsetX={halfW}
          offsetY={halfH}
          stroke="#2563eb"
          strokeWidth={2 * inverseScale}
          dash={[6 * inverseScale, 4 * inverseScale]}
          listening={false}
        />
      </Group>
      {showToolbar && (
        <Group x={instance.x} y={instance.y + topOffsetY} scaleX={inverseScale} scaleY={inverseScale}>
          <ToolbarButton index={0} label="⟳" onClick={onRotate} />
          <ToolbarButton index={1} label="⇄" onClick={onMirror} />
          <ToolbarButton index={2} label="⧉" onClick={onDuplicate} />
          <ToolbarButton index={3} label="✕" onClick={onDelete} variant="danger" />
        </Group>
      )}
    </>
  );
}
