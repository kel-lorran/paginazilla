import styles from "./MobileActionBar.module.css";

interface MobileActionBarProps {
  onRotate: () => void;
  onMirror: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

/** Substitui a toolbar flutuante no layout mobile — botões grandes, sempre no mesmo lugar. */
export function MobileActionBar({ onRotate, onMirror, onDuplicate, onDelete }: MobileActionBarProps) {
  return (
    <div className={styles.bar}>
      <button type="button" className={styles.button} onClick={onRotate}>
        <span className={styles.glyph}>⟳</span>
        <span className={styles.label}>Rotacionar</span>
      </button>
      <button type="button" className={styles.button} onClick={onMirror}>
        <span className={styles.glyph}>⇄</span>
        <span className={styles.label}>Espelhar</span>
      </button>
      <button type="button" className={styles.button} onClick={onDuplicate}>
        <span className={styles.glyph}>⧉</span>
        <span className={styles.label}>Duplicar</span>
      </button>
      <button type="button" className={`${styles.button} ${styles.danger}`} onClick={onDelete}>
        <span className={styles.glyph}>✕</span>
        <span className={styles.label}>Excluir</span>
      </button>
    </div>
  );
}
