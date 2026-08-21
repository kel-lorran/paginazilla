import type { Point, ScaleCalibration } from "../types";

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function calibrateScale(
  referenceLine: [Point, Point],
  realLengthCm: number,
): ScaleCalibration {
  const pixelDistance = distance(referenceLine[0], referenceLine[1]);
  return {
    referenceLine,
    realLengthCm,
    pixelsPerCm: pixelDistance / realLengthCm,
  };
}

export function cmToPixels(cm: number, calibration: ScaleCalibration): number {
  return cm * calibration.pixelsPerCm;
}

export function pixelsToCm(px: number, calibration: ScaleCalibration): number {
  return px / calibration.pixelsPerCm;
}
