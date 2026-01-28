// Configuration des limites de photos

export const PHOTO_CONFIG = {
  // Limites par type de compte
  maxPhotosFree: parseInt(process.env.NEXT_PUBLIC_MAX_PHOTOS_FREE || '6', 10),
  maxPhotosPremium: parseInt(process.env.NEXT_PUBLIC_MAX_PHOTOS_PREMIUM || '20', 10),

  // Pagination
  photosPerPage: parseInt(process.env.NEXT_PUBLIC_PHOTOS_PER_PAGE || '8', 10),

  // Limites techniques
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxImageWidth: 2000,
  maxImageHeight: 2000,
  allowedFormats: ['jpg', 'jpeg', 'png', 'gif'],
};

export function getMaxPhotos(isPremium: boolean): number {
  return isPremium ? PHOTO_CONFIG.maxPhotosPremium : PHOTO_CONFIG.maxPhotosFree;
}

export function getPhotosPerPage(): number {
  return PHOTO_CONFIG.photosPerPage;
}
