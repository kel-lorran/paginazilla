import type { Material } from "../../types";
import styles from "./MaterialPanel.module.css";

interface MaterialPanelProps {
  materials: Material[];
  onAdd: (material: Material) => void;
}

export function MaterialPanel({ materials, onAdd }: MaterialPanelProps) {
  return (
    <div className={styles.panel}>
      <p className={styles.title}>Materiais</p>
      {materials.map((material) => (
        <button
          key={material.id}
          type="button"
          className={styles.item}
          onClick={() => onAdd(material)}
        >
          <img
            className={styles.itemImage}
            src={material.imageUrl}
            alt={material.name}
          />
          <span className={styles.itemName}>{material.name}</span>
          <span className={styles.itemSize}>
            {material.realWidthCm}×{material.realHeightCm} cm
          </span>
        </button>
      ))}
    </div>
  );
}
