/**
 * Perkecil sebuah sumber gambar (elemen img/video/canvas) secara proporsional
 * lalu encode menjadi JPEG data URL.
 *
 * @param source    Sumber yang bisa digambar ke canvas (HTMLImageElement,
 *                  HTMLVideoElement, HTMLCanvasElement, ...).
 * @param width     Dimensi intrinsik `source` (mis. img.width / video.videoWidth).
 * @param height    Dimensi intrinsik `source`.
 * @param maxSize   Sisi terpanjang maksimum dalam piksel.
 * @param quality   Kualitas JPEG (0-1).
 */
export function downscaleToJpeg(
  source: CanvasImageSource,
  width: number,
  height: number,
  maxSize = 200,
  quality = 0.7,
): string {
  // Perkecil proporsional agar sisi terpanjang = maxSize
  if (width > height) {
    if (width > maxSize) {
      height = Math.round((height * maxSize) / width);
      width = maxSize;
    }
  } else if (height > maxSize) {
    width = Math.round((width * maxSize) / height);
    height = maxSize;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  ctx.drawImage(source, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Compress and resize an image file to a base64 JPEG string.
 * Target: max 200x200px, JPEG quality 0.7 (~10-20KB per image)
 */
export function compressImage(
  file: File,
  maxSize = 200,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          resolve(downscaleToJpeg(img, img.width, img.height, maxSize, quality));
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
