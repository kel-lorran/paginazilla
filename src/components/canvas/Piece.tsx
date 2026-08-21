import { Group, Image as KonvaImage, Rect, Text } from "react-konva";
import type Konva from "konva";
import useImage from "use-image";
import type { Material, PieceInstance } from "../../types";

interface PieceProps {
  instance: PieceInstance;
  material: Material;
  widthPx: number;
  heightPx: number;
  /** Selecionada sozinha — mostra a toolbar completa (mover/rotacionar/espelhar/excluir). */
  selected: boolean;
  /** Faz parte de uma seleção múltipla — só mostra o contorno, sem toolbar individual. */
  highlighted: boolean;
  /** 1 / viewport.scale — usado pra manter a toolbar com tamanho constante na tela. */
  inverseScale: number;
  onSelect: (shiftKey: boolean) => void;
  onDragStart: () => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
  onRotate: () => void;
  onMirror: () => void;
  onDelete: () => void;
}

const ROTATE_STEP_DEG = 15;
const TOOLBAR_BUTTON_SIZE = 28;
const TOOLBAR_GAP = 6;

export function Piece({
  instance,
  material,
  widthPx,
  heightPx,
  selected,
  highlighted,
  inverseScale,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  onRotate,
  onMirror,
  onDelete,
}: PieceProps) {
  const [image] = useImage(material.imageUrl);

  function handleDragMove(e: Konva.KonvaEventObject<DragEvent>) {
    onDragMove(e.target.x(), e.target.y());
  }

  function handleDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
    onDragEnd(e.target.x(), e.target.y());
  }

  return (
    <Group
      x={instance.x}
      y={instance.y}
      rotation={instance.rotationDeg}
      draggable
      onDragStart={onDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onClick={(e) => onSelect(e.evt.shiftKey)}
      onTap={() => onSelect(false)}
    >
      {image && (
        <KonvaImage
          image={image}
          width={widthPx}
          height={heightPx}
          offsetX={widthPx / 2}
          offsetY={heightPx / 2}
          scaleX={instance.mirrored ? -1 : 1}
        />
      )}
      {(selected || highlighted) && (
        <Rect
          width={widthPx}
          height={heightPx}
          offsetX={widthPx / 2}
          offsetY={heightPx / 2}
          stroke="#2563eb"
          strokeWidth={2 * inverseScale}
          dash={[6 * inverseScale, 4 * inverseScale]}
          listening={false}
        />
      )}
      {selected && (
        <Group
          x={widthPx / 2}
          y={-heightPx / 2}
          rotation={-instance.rotationDeg}
          scaleX={inverseScale}
          scaleY={inverseScale}
        >
          <ToolbarButton index={0} label="⟳" onClick={onRotate} />
          <ToolbarButton index={1} label="⇄" onClick={onMirror} />
          <ToolbarButton index={2} label="✕" onClick={onDelete} variant="danger" />
        </Group>
      )}
    </Group>
  );
}

function ToolbarButton({
  index,
  label,
  onClick,
  variant = "default",
}: {
  index: number;
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
}) {
  const offset = index * (TOOLBAR_BUTTON_SIZE + TOOLBAR_GAP);
  const isDanger = variant === "danger";
  return (
    <Group
      x={offset}
      y={-(TOOLBAR_BUTTON_SIZE + TOOLBAR_GAP)}
      onClick={(e) => {
        e.cancelBubble = true;
        onClick();
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onClick();
      }}
    >
      <Rect
        width={TOOLBAR_BUTTON_SIZE}
        height={TOOLBAR_BUTTON_SIZE}
        cornerRadius={6}
        fill={isDanger ? "#fef2f2" : "white"}
        stroke={isDanger ? "#fca5a5" : "#d1d5db"}
        strokeWidth={1}
        shadowColor="black"
        shadowOpacity={0.15}
        shadowBlur={4}
      />
      <Text
        text={label}
        width={TOOLBAR_BUTTON_SIZE}
        height={TOOLBAR_BUTTON_SIZE}
        align="center"
        verticalAlign="middle"
        fontSize={16}
        fill={isDanger ? "#dc2626" : "#111827"}
        listening={false}
      />
    </Group>
  );
}

export { ROTATE_STEP_DEG, TOOLBAR_BUTTON_SIZE, TOOLBAR_GAP, ToolbarButton };
