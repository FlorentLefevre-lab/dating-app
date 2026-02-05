// Configuration des limites de photos

export const PHOTO_CONFIG = {
  // Limites par type de compte
  maxPhotosFree: parseInt(process.env.NEXT_PUBLIC_MAX_PHOTOS_FREE || '6', 10),
  maxPhotosPremium: parseInt(process.env.NEXT_PUBLIC_MAX_PHOTOS_PREMIUM || '20', 10),

  // Pagination
  photosPerPage: parseInt(process.env.NEXT_PUBLIC_PHOTOS_PER_PAGE || '8', 10),

  // Limites techniques
  maxFileSize: 2 * 1024 * 1024, // 2MB
  maxImageWidth: 2000,
  maxImageHeight: 2000,
  allowedFormats: ['jpg', 'jpeg', 'png', 'gif'],

  // Compression client-side
  compression: {
    maxCompressedSize: 2 * 1024 * 1024, // 2MB - taille max après compression
    steps: [
      // Paliers de compression essayés dans l'ordre
      { quality: 0.8, maxDimension: null },       // Qualité 0.8, taille originale
      { quality: 0.6, maxDimension: null },       // Qualité 0.6, taille originale
      { quality: 0.7, maxDimension: 1600 },       // Qualité 0.7, max 1600px
      { quality: 0.7, maxDimension: 1200 },       // Qualité 0.7, max 1200px
      { quality: 0.6, maxDimension: 800 },        // Qualité 0.6, max 800px
    ] as { quality: number; maxDimension: number | null }[],
  },
};

export function getMaxPhotos(isPremium: boolean): number {
  return isPremium ? PHOTO_CONFIG.maxPhotosPremium : PHOTO_CONFIG.maxPhotosFree;
}

export function getPhotosPerPage(): number {
  return PHOTO_CONFIG.photosPerPage;
}
