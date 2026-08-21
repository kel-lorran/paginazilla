import { useEffect, useState } from "react";
import { loadLuminanceMaskCanvas, type LuminanceMaskOptions } from "../lib/luminanceMask";

export function useLuminanceMaskImage(
  src: string | undefined,
  options?: LuminanceMaskOptions,
): HTMLCanvasElement | null {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const featherPx = options?.featherPx;

  useEffect(() => {
    setCanvas(null);
    if (!src) return;

    let cancelled = false;
    loadLuminanceMaskCanvas(src, { featherPx }).then((result) => {
      if (!cancelled) setCanvas(result);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, featherPx]);

  return canvas;
}
