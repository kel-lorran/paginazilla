import { useEffect, useState } from "react";
import { loadLuminanceMaskCanvas } from "../lib/luminanceMask";

export function useLuminanceMaskImage(src: string | undefined): HTMLCanvasElement | null {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setCanvas(null);
    if (!src) return;

    let cancelled = false;
    loadLuminanceMaskCanvas(src).then((result) => {
      if (!cancelled) setCanvas(result);
    });

    return () => {
      cancelled = true;
    };
  }, [src]);

  return canvas;
}
