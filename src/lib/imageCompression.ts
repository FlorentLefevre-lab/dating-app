import { PHOTO_CONFIG } from '@/lib/config/photos';

/**
 * Compresser une image via Canvas API.
 * Retourne le fichier (compressé ou non) si <= 2 Mo, ou null si impossible.
 * Les GIF ne sont pas compressés (perte d'animation).
 */
export async function compressImage(
  file: File
): Promise<{ file: File; compressed: boolean } | null> {
  const maxSize = PHOTO_CONFIG.compression.maxCompressedSize;

  // Déjà sous la limite → pas de compression nécessaire
  if (file.size <= maxSize) {
    return { file, compressed: false };
  }

  // Les GIF ne peuvent pas être compressés via Canvas (perte d'animation)
  if (file.type === 'image/gif') {
    return null;
  }

  // Charger l'image dans un élément Image
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Impossible de charger l\'image'));
    image.src = URL.createObjectURL(file);
  });

  const originalWidth = img.naturalWidth;
  const originalHeight = img.naturalHeight;

  // Essayer chaque palier de compression
  for (const step of PHOTO_CONFIG.compression.steps) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    let targetWidth = originalWidth;
    let targetHeight = originalHeight;

    // Réduire les dimensions si maxDimension est défini
    if (step.maxDimension !== null) {
      const maxDim = step.maxDimension;
      if (targetWidth > maxDim || targetHeight > maxDim) {
        if (targetWidth >= targetHeight) {
          targetHeight = Math.round((targetHeight / targetWidth) * maxDim);
          targetWidth = maxDim;
        } else {
          targetWidth = Math.round((targetWidth / targetHeight) * maxDim);
          targetHeight = maxDim;
        }
      }
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    // Exporter en JPEG avec la qualité spécifiée
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', step.quality);
    });

    if (blob && blob.size <= maxSize) {
      URL.revokeObjectURL(img.src);

      const compressedFile = new File(
        [blob],
        file.name.replace(/\.[^.]+$/, '.jpg'),
        { type: 'image/jpeg' }
      );
      return { file: compressedFile, compressed: true };
    }
  }

  // Nettoyage
  URL.revokeObjectURL(img.src);

  // Aucun palier n'a suffi → refus
  return null;
}
