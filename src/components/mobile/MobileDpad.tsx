import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import styles from "./MobileDpad.module.css";

// Coordenadas no espaço do viewBox (não em px de tela) — ver MobileDpad.module.css pro tamanho real.
const VIEW_MIN_X = -6;
const VIEW_MIN_Y = -10;
const VIEW_W = 128;
const VIEW_H = 116;
const CENTER = 60;
const ARC_RADIUS = 58;
const MAX_ANGLE_DEG = 90;
const SNAP_STEP_DEG = 5;

interface MobileDpadProps {
  /** dx/dy valem -1, 0 ou 1 — quem chama decide o passo em cm. */
  onNudge: (dx: number, dy: number) => void;
  /** Chamado uma vez no início do arraste do satélite — é onde o histórico de desfazer deve ser empurrado. */
  onRotateStart: () => void;
  /** Chamado a cada incremento de 5° durante o arraste (delta relativo, já quantizado). */
  onRotateDelta: (deltaDeg: number) => void;
  style?: CSSProperties;
}

function clampAngle(deg: number): number {
  return Math.max(-MAX_ANGLE_DEG, Math.min(MAX_ANGLE_DEG, deg));
}

/** Ângulo do ponteiro relativo ao centro do diamante, em graus — 0 = topo, sentido horário positivo. */
function angleFromPointer(svg: SVGSVGElement, clientX: number, clientY: number): number {
  const rect = svg.getBoundingClientRect();
  const centerScreenX = rect.left + ((CENTER - VIEW_MIN_X) / VIEW_W) * rect.width;
  const centerScreenY = rect.top + ((CENTER - VIEW_MIN_Y) / VIEW_H) * rect.height;
  const dx = clientX - centerScreenX;
  const dy = clientY - centerScreenY;
  return (Math.atan2(dx, -dy) * 180) / Math.PI;
}

function satelliteTransform(angleDeg: number): string {
  const rad = (angleDeg * Math.PI) / 180;
  const x = CENTER + ARC_RADIUS * Math.sin(rad);
  const y = CENTER - ARC_RADIUS * Math.cos(rad);
  return `translate(${x},${y}) rotate(${angleDeg})`;
}

/**
 * Cruz flutuante mobile: diamante único (4 triângulos facetados, toque em cada um pra mover)
 * + satélite em losango que desliza por um arco de até 180° (trava nas pontas) pra girar,
 * com gap magnético de 5°.
 */
export function MobileDpad({ onNudge, onRotateStart, onRotateDelta, style }: MobileDpadProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef(false);
  const lastAngleRef = useRef(0);
  const accumulatedRef = useRef(0);
  const appliedRef = useRef(0);
  const [handleAngle, setHandleAngle] = useState(0);
  const [dragging, setDragging] = useState(false);

  function handlePointerDown(e: ReactPointerEvent<SVGCircleElement>) {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    svg.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    accumulatedRef.current = 0;
    appliedRef.current = 0;
    lastAngleRef.current = angleFromPointer(svg, e.clientX, e.clientY);
    setHandleAngle(0);
    setDragging(true);
    onRotateStart();
  }

  function handlePointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (!draggingRef.current) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rawAngle = angleFromPointer(svg, e.clientX, e.clientY);
    let delta = rawAngle - lastAngleRef.current;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    lastAngleRef.current = rawAngle;
    accumulatedRef.current += delta;

    const clamped = clampAngle(accumulatedRef.current);
    setHandleAngle(clamped);

    const snappedTotal = Math.round(clamped / SNAP_STEP_DEG) * SNAP_STEP_DEG;
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

  return (
    <div className={styles.wrap} style={style}>
      <svg
        ref={svgRef}
        className={styles.svg}
        viewBox={`${VIEW_MIN_X} ${VIEW_MIN_Y} ${VIEW_W} ${VIEW_H}`}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <path className={styles.arcPath} d="M 2 60 A 58 58 0 0 1 118 60" />
        <circle className={styles.arcTick} cx="2" cy="60" r="2.2" />
        <circle className={styles.arcTick} cx="118" cy="60" r="2.2" />

        <polygon
          className={styles.facetUp}
          points="44,44 76,44 60,20"
          role="button"
          aria-label="Mover pra cima"
          onClick={() => onNudge(0, -1)}
        />
        <polygon
          className={styles.facetRight}
          points="76,44 76,76 100,60"
          role="button"
          aria-label="Mover pra direita"
          onClick={() => onNudge(1, 0)}
        />
        <polygon
          className={styles.facetDown}
          points="44,76 76,76 60,100"
          role="button"
          aria-label="Mover pra baixo"
          onClick={() => onNudge(0, 1)}
        />
        <polygon
          className={styles.facetLeft}
          points="44,44 44,76 20,60"
          role="button"
          aria-label="Mover pra esquerda"
          onClick={() => onNudge(-1, 0)}
        />
        <rect className={styles.core} x="44" y="44" width="32" height="32" />

        <g
          className={dragging ? styles.satellite : `${styles.satellite} ${styles.satelliteAnimated}`}
          transform={satelliteTransform(handleAngle)}
        >
          <polygon className={styles.satA} points="0,-6 0,6 -13,0" />
          <polygon className={styles.satB} points="0,-6 0,6 13,0" />
          <line className={styles.satDiv} x1="0" y1="-6" x2="0" y2="6" />
          {/* área de toque maior que o desenho, só pra facilitar segurar o satélite */}
          <circle
            className={styles.satHit}
            cx="0"
            cy="0"
            r="16"
            onPointerDown={handlePointerDown}
            aria-label="Girar (arraste)"
            role="slider"
            aria-valuemin={-MAX_ANGLE_DEG}
            aria-valuemax={MAX_ANGLE_DEG}
            aria-valuenow={Math.round(handleAngle)}
          />
        </g>
      </svg>
    </div>
  );
}
