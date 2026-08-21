import styles from "./IsometricPreview.module.css";

export function IsometricPreview({ src }: { src: string }) {
  return (
    <div className={styles.wrapper}>
      <img src={src} alt="Perspectiva isométrica do projeto" />
    </div>
  );
}
