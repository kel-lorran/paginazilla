import { Group, Image as KonvaImage, Rect, Text } from "react-konva";
import type Konva from "konva";
import useImage from "use-image";
import type { Material, PieceInstance } from "../../types";

interface PieceProps {
  instance: PieceInstance;
  material: Material;
  widthPx: number;
  heightPx: number;
  selected: boolean;
  /** 1 / viewport.scale — usado pra manter a toolbar com tamanho constante na tela. */
  inverseScale: number;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onRotate: () => void;
  onMirror: () => void;
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
  inverseScale,
  onSelect,
  onMove,
  onRotate,
  onMirror,
}: PieceProps) {
  const [image] = useImage(material.imageUrl);

  function handleDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
    onMove(e.target.x(), e.target.y());
  }

  return (
    <Group
      x={instance.x}
      y={instance.y}
      rotation={instance.rotationDeg}
      draggable
      onDragEnd={handleDragEnd}
      onClick={onSelect}
      onTap={onSelect}
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
      {selected && (
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
          <ToolbarButton
            index={0}
            label="⟳"
            title="Rotacionar"
            onClick={onRotate}
          />
          <ToolbarButton
            index={1}
            label="⇄"
            title="Espelhar"
            onClick={onMirror}
          />
        </Group>
      )}
    </Group>
  );
}

function ToolbarButton({
  index,
  label,
  onClick,
}: {
  index: number;
  label: string;
  title: string;
  onClick: () => void;
}) {
  const offset = index * (TOOLBAR_BUTTON_SIZE + TOOLBAR_GAP);
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
        fill="white"
        stroke="#d1d5db"
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
        fill="#111827"
        listening={false}
      />
    </Group>
  );
}

export { ROTATE_STEP_DEG };
