/**
 * Converte uma imagem preto-e-branco numa máscara: preto vira opaco (bloqueia),
 * branco vira transparente (deixa passar), cinzas ficam parciais. Não exige que
 * o autor prepare canal alfa — qualquer PNG/JPG em escala de cinza funciona.
 */
export function loadLuminanceMaskCanvas(src: string): Promise<HTMLCanvasElement> {
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
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
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
