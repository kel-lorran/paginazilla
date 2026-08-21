export interface LuminanceMaskOptions {
  /** Raio do desfoque aplicado antes de calcular a transparência — borda suave em vez de corte duro. */
  featherPx?: number;
  /** Cor usada nas áreas "bloqueadas", como [r, g, b]. Um tom claro se mescla melhor ao fundo do que preto puro. */
  tintColor?: [number, number, number];
}

const DEFAULT_TINT: [number, number, number] = [229, 231, 235]; // cinza claro, perto do fundo da UI

/**
 * Converte uma imagem preto-e-branco numa máscara: preto vira opaco (bloqueia),
 * branco vira transparente (deixa passar), cinzas ficam parciais. Não exige que
 * o autor prepare canal alfa — qualquer PNG/JPG em escala de cinza funciona.
 */
export function loadLuminanceMaskCanvas(
  src: string,
  options: LuminanceMaskOptions = {},
): Promise<HTMLCanvasElement> {
  const [tr, tg, tb] = options.tintColor ?? DEFAULT_TINT;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context indisponível"));
        return;
      }

      const featherPx = options.featherPx ?? Math.max(img.naturalWidth, img.naturalHeight) * 0.03;
      if (featherPx > 0) {
        ctx.filter = `blur(${featherPx}px)`;
      }
      ctx.drawImage(img, 0, 0);
      ctx.filter = "none";

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = tr;
        data[i + 1] = tg;
        data[i + 2] = tb;
        data[i + 3] = 255 - luminance;
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas);
    };
    img.onerror = reject;
    img.crossOrigin = "anonymous";
    img.src = src;
  });
}
