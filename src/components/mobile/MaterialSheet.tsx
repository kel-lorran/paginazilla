import { useState } from "react";
import type { Material } from "../../types";
import styles from "./MaterialSheet.module.css";

interface MaterialSheetProps {
  materials: Material[];
  onAdd: (material: Material) => void;
}

/** Gaveta de materiais pro layout mobile — toque no cabeçalho pra abrir/fechar. */
export function MaterialSheet({ materials, onAdd }: MaterialSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={open ? styles.sheet : `${styles.sheet} ${styles.closed}`}>
      <div className={styles.handleRow} onClick={() => setOpen((o) => !o)}>
        <div className={styles.handle} />
      </div>
      <div className={styles.titleRow} onClick={() => setOpen((o) => !o)}>
        <span className={styles.title}>Materiais</span>
        <span className={styles.hint}>{open ? "toque pra fechar" : "toque pra abrir"}</span>
      </div>
      <div className={styles.grid}>
        {materials.map((material) => (
          <button
            key={material.id}
            type="button"
            className={styles.card}
            onClick={() => onAdd(material)}
          >
            <img className={styles.thumb} src={material.imageUrl} alt={material.name} />
            <span className={styles.name}>{material.name}</span>
            <span className={styles.size}>
              {material.realWidthCm}×{material.realHeightCm} cm
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
