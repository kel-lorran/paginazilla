import { Image as KonvaImage, Transformer } from "react-konva";
import type Konva from "konva";
import { useEffect, useRef } from "react";
import useImage from "use-image";
import type { DraftMaterial } from "../../state/authorStore";

interface MaterialCalibrationShapeProps {
  material: DraftMaterial;
  size: { widthPx: number; heightPx: number };
  position: { x: number; y: number };
  onChange: (next: {
    x: number;
    y: number;
    widthPx: number;
    heightPx: number;
  }) => void;
}

export function MaterialCalibrationShape({
  material,
  size,
  position,
  onChange,
}: MaterialCalibrationShapeProps) {
  const [image] = useImage(material.previewUrl);
  const shapeRef = useRef<Konva.Image>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (shapeRef.current && transformerRef.current) {
      transformerRef.current.nodes([shapeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [image]);

  function handleTransformEnd() {
    const node = shapeRef.current;
    if (!node) return;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    onChange({
      x: node.x(),
      y: node.y(),
      widthPx: Math.max(4, size.widthPx * scaleX),
      heightPx: Math.max(4, size.heightPx * scaleY),
    });
  }

  function handleDragEnd() {
    const node = shapeRef.current;
    if (!node) return;
    onChange({ x: node.x(), y: node.y(), widthPx: size.widthPx, heightPx: size.heightPx });
  }

  if (!image) return null;

  return (
    <>
      <KonvaImage
        ref={shapeRef}
        image={image}
        x={position.x}
        y={position.y}
        width={size.widthPx}
        height={size.heightPx}
        draggable
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
      />
      <Transformer
        ref={transformerRef}
        keepRatio={false}
        enabledAnchors={[
          "top-left",
          "top-right",
          "bottom-left",
          "bottom-right",
        ]}
        rotateEnabled={false}
      />
    </>
  );
}
