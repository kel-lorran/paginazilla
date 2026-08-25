import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import styles from "./MobileDpad.module.css";

const RING_SIZE = 84;
const RING_RADIUS = 38;
const RING_CENTER = RING_SIZE / 2;
const SNAP_STEP_DEG = 5;

interface MobileDpadProps {
  /** dx/dy valem -1, 0 ou 1 — quem chama decide o passo em cm. */
  onNudge: (dx: number, dy: number) => void;
  /** Chamado uma vez no início do arraste do anel — é onde o histórico de desfazer deve ser empurrado. */
  onRotateStart: () => void;
  /** Chamado a cada incremento de 5° durante o arraste (delta relativo, já quantizado). */
  onRotateDelta: (deltaDeg: number) => void;
  style?: CSSProperties;
}

function angleFromPointer(el: HTMLElement, clientX: number, clientY: number): number {
  const rect = el.getBoundingClientRect();
  const dx = clientX - (rect.left + rect.width / 2);
  const dy = clientY - (rect.top + rect.height / 2);
  let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

/** Cruz flutuante mobile: 4 triângulos pra mover (toque) + anel de arraste pra girar, com gap magnético de 5°. */
export function MobileDpad({ onNudge, onRotateStart, onRotateDelta, style }: MobileDpadProps) {
  const ringRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const lastAngleRef = useRef(0);
  const accumulatedRef = useRef(0);
  const appliedRef = useRef(0);
  const [handleAngle, setHandleAngle] = useState(0);
  const [dragging, setDragging] = useState(false);

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.preventDefault();
    const el = ringRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    accumulatedRef.current = 0;
    appliedRef.current = 0;
    const angle = angleFromPointer(el, e.clientX, e.clientY);
    lastAngleRef.current = angle;
    setHandleAngle(angle);
    setDragging(true);
    onRotateStart();
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    const el = ringRef.current;
    if (!el) return;
    const angle = angleFromPointer(el, e.clientX, e.clientY);
    let delta = angle - lastAngleRef.current;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    lastAngleRef.current = angle;
    accumulatedRef.current += delta;
    setHandleAngle(angle);

    const snappedTotal = Math.round(accumulatedRef.current / SNAP_STEP_DEG) * SNAP_STEP_DEG;
    const stepDelta = snappedTotal - appliedRef.current;
    if (stepDelta !== 0) {
      appliedRef.current = snappedTotal;
      onRotateDelta(stepDelta);
    }
  }

  function handlePointerUp() {
    draggingRef.current = false;
    setDragging(false);
    setHandleAngle(0);
  }

  const rad = (handleAngle * Math.PI) / 180;
  const handleX = RING_CENTER + RING_RADIUS * Math.sin(rad);
  const handleY = RING_CENTER - RING_RADIUS * Math.cos(rad);

  return (
    <div className={styles.wrap} style={style}>
      <div
        ref={ringRef}
        className={styles.ring}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <button
          type="button"
          className={`${styles.hit} ${styles.hitUp}`}
          aria-label="Mover pra cima"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onNudge(0, -1);
          }}
        >
          <span className={`${styles.tri} ${styles.triUp}`} />
        </button>
        <button
          type="button"
          className={`${styles.hit} ${styles.hitDown}`}
          aria-label="Mover pra baixo"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onNudge(0, 1);
          }}
        >
          <span className={`${styles.tri} ${styles.triDown}`} />
        </button>
        <button
          type="button"
          className={`${styles.hit} ${styles.hitLeft}`}
          aria-label="Mover pra esquerda"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onNudge(-1, 0);
          }}
        >
          <span className={`${styles.tri} ${styles.triLeft}`} />
        </button>
        <button
          type="button"
          className={`${styles.hit} ${styles.hitRight}`}
          aria-label="Mover pra direita"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onNudge(1, 0);
          }}
        >
          <span className={`${styles.tri} ${styles.triRight}`} />
        </button>
        <div
          className={dragging ? styles.handle : `${styles.handle} ${styles.handleAnimated}`}
          style={{ top: handleY, left: handleX }}
        />
      </div>
    </div>
  );
}
