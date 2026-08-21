import { useEffect, useState } from "react";
import type { TutorialTip } from "../../data/tutorialTips";
import styles from "./TutorialModal.module.css";

interface TutorialModalProps {
  tips: TutorialTip[];
  onClose: () => void;
}

export function TutorialModal({ tips, onClose }: TutorialModalProps) {
  const [step, setStep] = useState(0);
  const tip = tips[step];
  const isLast = step === tips.length - 1;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setStep((s) => Math.min(s + 1, tips.length - 1));
      if (e.key === "ArrowLeft") setStep((s) => Math.max(s - 1, 0));
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, tips.length]);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <span className={styles.step}>
          Dica {step + 1} de {tips.length}
        </span>
        <h2 className={styles.title}>{tip.title}</h2>
        <p className={styles.body}>{tip.body}</p>
        <div className={styles.dots}>
          {tips.map((_, i) => (
            <span key={i} className={i === step ? `${styles.dot} ${styles.dotActive}` : styles.dot} />
          ))}
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.skipButton} onClick={onClose}>
            Fechar
          </button>
          <button
            type="button"
            className={styles.nextButton}
            onClick={() => (isLast ? onClose() : setStep((s) => s + 1))}
          >
            {isLast ? "Concluir" : "Próxima dica"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TutorialHelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className={styles.helpButton}
      onClick={onClick}
      title="Ver dicas de uso"
      aria-label="Ver dicas de uso"
    >
      ?
    </button>
  );
}
