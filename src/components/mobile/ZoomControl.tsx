import type { CSSProperties } from "react";
import type { Viewport } from "../../types";
import styles from "./ZoomControl.module.css";

const MIN_SCALE = 0.1;
const MAX_SCALE = 8;
const ZOOM_STEP = 1.3;

interface ZoomControlProps {
  viewport: Viewport;
  onViewportChange: (viewport: Viewport) => void;
  canvasWidth: number;
  canvasHeight: number;
  style?: CSSProperties;
}

/** Zoom por botão — alternativa/reforço à pinça, sempre visível e fácil de mirar. */
export function ZoomControl({ viewport, onViewportChange, canvasWidth, canvasHeight, style }: ZoomControlProps) {
  function zoomBy(factor: number) {
    const center = { x: canvasWidth / 2, y: canvasHeight / 2 };
    const pointTo = {
      x: (center.x - viewport.x) / viewport.scale,
      y: (center.y - viewport.y) / viewport.scale,
    };
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, viewport.scale * factor));
    onViewportChange({
      scale: newScale,
      x: center.x - pointTo.x * newScale,
      y: center.y - pointTo.y * newScale,
    });
  }

  return (
    <div className={styles.control} style={style}>
      <button type="button" className={styles.button} onClick={() => zoomBy(ZOOM_STEP)} aria-label="Aumentar zoom">
        +
      </button>
      <button type="button" className={styles.button} onClick={() => zoomBy(1 / ZOOM_STEP)} aria-label="Diminuir zoom">
        −
      </button>
    </div>
  );
}
