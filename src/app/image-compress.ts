/**
 * Ridimensiona e ricodifica in WebP le immagini incorporate nei documenti .docx letti da mammoth,
 * così da evitare di salvare in IndexedDB / negli snapshot PNG o JPEG non compressi da più megabyte.
 * Se la ricodifica non riduce la dimensione o fallisce, mantiene l'immagine originale.
 */

export const IMAGE_MAX_DIM = 700;
export const IMAGE_QUALITY = 0.65;

const RASTER_RE = /^image\/(png|jpe?g|webp|bmp)$/i;

function base64ToBlob(base64: string, contentType: string): Blob {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: contentType });
}

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

export async function compressImageToDataUri(base64: string, contentType: string): Promise<string> {
  const orig = `data:${contentType};base64,${base64}`;
  if (!RASTER_RE.test(contentType) || typeof createImageBitmap !== 'function') return orig;

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(base64ToBlob(base64, contentType));
    let w = bitmap.width;
    let h = bitmap.height;
    if (!w || !h) return orig;

    const maxSide = Math.max(w, h);
    if (maxSide > IMAGE_MAX_DIM) {
      const scale = IMAGE_MAX_DIM / maxSide;
      w = Math.max(1, Math.round(w * scale));
      h = Math.max(1, Math.round(h * scale));
    }

    let compressed = '';
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext('2d');
      if (!ctx) return orig;
      ctx.drawImage(bitmap, 0, 0, w, h);
      const blob = await canvas.convertToBlob({ type: 'image/webp', quality: IMAGE_QUALITY });
      compressed = await blobToDataUri(blob);
    } else if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return orig;
      ctx.drawImage(bitmap, 0, 0, w, h);
      compressed = canvas.toDataURL('image/webp', IMAGE_QUALITY);
    }

    return compressed && compressed.length < orig.length ? compressed : orig;
  } catch {
    return orig;
  } finally {
    bitmap?.close();
  }
}
