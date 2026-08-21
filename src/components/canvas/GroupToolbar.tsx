import { Group } from "react-konva";
import { ToolbarButton } from "./Piece";

interface GroupToolbarProps {
  x: number;
  y: number;
  inverseScale: number;
  onRotate: () => void;
  onMirror: () => void;
  onDelete: () => void;
}

export function GroupToolbar({ x, y, inverseScale, onRotate, onMirror, onDelete }: GroupToolbarProps) {
  return (
    <Group x={x} y={y} scaleX={inverseScale} scaleY={inverseScale}>
      <ToolbarButton index={0} label="⟳" onClick={onRotate} />
      <ToolbarButton index={1} label="⇄" onClick={onMirror} />
      <ToolbarButton index={2} label="✕" onClick={onDelete} variant="danger" />
    </Group>
  );
}
