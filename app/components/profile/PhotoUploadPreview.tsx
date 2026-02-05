'use client';

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ShieldExclamationIcon,
  CameraIcon,
} from '@heroicons/react/24/outline';
import { useNSFWDetection, NSFWResult } from '@/hooks/useNSFWDetection';
import { PHOTO_CONFIG } from '@/lib/config/photos';

// État de compression par image (index dans results)
interface CompressionState {
  status: 'pending' | 'compressing' | 'done' | 'too_large';
  originalSize: number;
  compressedSize?: number;
  compressedFile?: File;
  error?: string;
}

// Formater la taille en Ko/Mo lisible
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

// Compresser une image via Canvas API
async function compressImage(
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
      // Nettoyer l'URL de l'objet
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

interface PhotoUploadPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: File[]) => Promise<void>;
  maxFiles: number;
  remainingSlots: number;
  initialFiles?: File[];
}

const PhotoUploadPreview: React.FC<PhotoUploadPreviewProps> = ({
  isOpen,
  onClose,
  onUpload,
  maxFiles,
  remainingSlots,
  initialFiles,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionStates, setCompressionStates] = useState<Map<number, CompressionState>>(new Map());
  const [dragOver, setDragOver] = useState(false);

  const {
    isModelLoading,
    isModelReady,
    modelError,
    analyzeImages,
    results,
    clearResults,
    getValidImages,
    validCount,
    blockedCount,
    analyzingCount,
  } = useNSFWDetection({ autoLoad: true });

  // Analyser automatiquement les fichiers pré-sélectionnés à l'ouverture
  useEffect(() => {
    if (isOpen && initialFiles && initialFiles.length > 0 && results.length === 0) {
      analyzeImages(initialFiles);
    }
  }, [isOpen, initialFiles]);

  // Gérer la sélection de fichiers
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Types MIME acceptés
    const acceptedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

    // Filtrer pour ne garder que les images
    const imageFiles = Array.from(files)
      .filter(file => {
        const isValidType = acceptedMimeTypes.includes(file.type.toLowerCase());
        const isValidExtension = PHOTO_CONFIG.allowedFormats.some(
          format => file.name.toLowerCase().endsWith(`.${format}`)
        );
        return isValidType || isValidExtension;
      })
      .slice(0, Math.min(remainingSlots, maxFiles));

    if (imageFiles.length === 0) return;

    // Analyser les images
    await analyzeImages(imageFiles);
  }, [analyzeImages, remainingSlots, maxFiles]);

  // Ouvrir le sélecteur de fichiers
  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  // Gérer le drag & drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // Supprimer une image de la liste
  const removeImage = (index: number) => {
    const result = results[index];
    if (result?.preview) {
      URL.revokeObjectURL(result.preview);
    }
    // Note: Le hook ne fournit pas de méthode pour supprimer un seul résultat
    // On pourrait l'ajouter, mais pour l'instant on garde le comportement simple
  };

  // Uploader les images validées (avec compression préalable)
  const handleUpload = async () => {
    const validImages = getValidImages();
    if (validImages.length === 0) return;

    setIsCompressing(true);
    const newStates = new Map<number, CompressionState>();

    // Phase 1 : compresser chaque image valide
    const filesToUpload: File[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      // Ignorer les images non valides (bloquées NSFW, en erreur, en analyse)
      if (result.isInappropriate || result.isAnalyzing || result.error) continue;

      newStates.set(i, {
        status: 'compressing',
        originalSize: result.file.size,
      });
      setCompressionStates(new Map(newStates));

      try {
        const compressed = await compressImage(result.file);

        if (compressed) {
          newStates.set(i, {
            status: 'done',
            originalSize: result.file.size,
            compressedSize: compressed.file.size,
            compressedFile: compressed.file,
          });
          filesToUpload.push(compressed.file);
        } else {
          // Compression impossible (toujours > 2 Mo ou GIF trop lourd)
          const isGif = result.file.type === 'image/gif';
          newStates.set(i, {
            status: 'too_large',
            originalSize: result.file.size,
            error: isGif
              ? 'GIF trop volumineux (2 Mo max, compression impossible)'
              : 'Image trop volumineuse même après compression (2 Mo max)',
          });
        }
      } catch {
        newStates.set(i, {
          status: 'too_large',
          originalSize: result.file.size,
          error: 'Erreur lors de la compression',
        });
      }

      setCompressionStates(new Map(newStates));
    }

    setIsCompressing(false);

    // Phase 2 : uploader les fichiers compressés/validés
    if (filesToUpload.length === 0) return;

    setIsUploading(true);
    try {
      await onUpload(filesToUpload);
      clearResults();
      setCompressionStates(new Map());
      onClose();
    } catch (error) {
      console.error('Erreur upload:', error);
    } finally {
      setIsUploading(false);
    }
  };

  // Fermer et nettoyer
  const handleClose = () => {
    clearResults();
    setCompressionStates(new Map());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Ajouter des photos
              </h3>
              <p className="text-sm text-gray-500">
                {remainingSlots} emplacement{remainingSlots > 1 ? 's' : ''} disponible{remainingSlots > 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Contenu */}
          <div className="p-4 overflow-y-auto max-h-[60vh]">
            {/* État du modèle */}
            {isModelLoading && (
              <div className="flex items-center justify-center gap-3 p-4 mb-4 bg-blue-50 rounded-xl">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-blue-700 font-medium">
                  Chargement du système de protection...
                </span>
              </div>
            )}

            {modelError && (
              <div className="flex items-center gap-3 p-4 mb-4 bg-red-50 rounded-xl">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                <span className="text-red-700">
                  Erreur de chargement: {modelError}
                </span>
              </div>
            )}

            {/* Zone de drop / sélection */}
            {results.length === 0 && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={openFileSelector}
                className={`
                  relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                  ${dragOver
                    ? 'border-pink-500 bg-pink-50'
                    : 'border-gray-300 hover:border-pink-400 hover:bg-pink-50/50'
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif"
                  multiple
                  onChange={e => handleFileSelect(e.target.files)}
                  className="hidden"
                />

                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2">
                    <CameraIcon className="w-10 h-10 text-pink-500" />
                    <ArrowUpTrayIcon className="w-10 h-10 text-pink-500" />
                  </div>
                  <div>
                    <p className="text-gray-700 font-semibold">
                      Glissez vos photos ici
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      ou cliquez pour parcourir
                    </p>
                  </div>
                  <p className="text-xs text-gray-400">
                    JPEG, PNG, GIF - 2 Mo max par image - Max {Math.min(remainingSlots, maxFiles)} photo{Math.min(remainingSlots, maxFiles) > 1 ? 's' : ''}
                  </p>
                </div>

                {/* Badge de protection */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-center gap-2 text-xs text-gray-500">
                  <ShieldExclamationIcon className="w-4 h-4" />
                  <span>Protection contre le contenu inapproprié activée</span>
                </div>
              </div>
            )}

            {/* Grille de prévisualisation */}
            {results.length > 0 && (
              <div className="space-y-4">
                {/* Stats */}
                <div className="flex items-center gap-4 text-sm">
                  {validCount > 0 && (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircleIcon className="w-4 h-4" />
                      {validCount} validée{validCount > 1 ? 's' : ''}
                    </span>
                  )}
                  {blockedCount > 0 && (
                    <span className="flex items-center gap-1 text-red-600">
                      <ShieldExclamationIcon className="w-4 h-4" />
                      {blockedCount} bloquée{blockedCount > 1 ? 's' : ''}
                    </span>
                  )}
                  {analyzingCount > 0 && (
                    <span className="flex items-center gap-1 text-blue-600">
                      <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      {analyzingCount} en cours...
                    </span>
                  )}
                </div>

                {/* Grille */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {results.map((result, index) => (
                    <PhotoPreviewCard key={index} result={result} compressionState={compressionStates.get(index)} />
                  ))}
                </div>

                {/* Bouton pour ajouter plus */}
                {results.length < remainingSlots && (
                  <button
                    onClick={openFileSelector}
                    className="w-full p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-pink-400 hover:text-pink-500 transition-colors"
                  >
                    + Ajouter d'autres photos
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {results.length > 0 && (
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  Annuler
                </button>

                <div className="flex items-center gap-3">
                  {blockedCount > 0 && (
                    <span className="text-sm text-red-600 flex items-center gap-1">
                      <ShieldExclamationIcon className="w-4 h-4" />
                      {blockedCount} photo{blockedCount > 1 ? 's' : ''} bloquée{blockedCount > 1 ? 's' : ''}
                    </span>
                  )}

                  <button
                    onClick={handleUpload}
                    disabled={validCount === 0 || isUploading || isCompressing || analyzingCount > 0}
                    className={`
                      px-6 py-2 rounded-xl font-semibold transition-all
                      ${validCount > 0 && !isUploading && !isCompressing && analyzingCount === 0
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:shadow-lg'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }
                    `}
                  >
                    {isCompressing ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Compression...
                      </span>
                    ) : isUploading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Upload...
                      </span>
                    ) : (
                      `Uploader ${validCount} photo${validCount > 1 ? 's' : ''}`
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Composant pour une carte de prévisualisation
const PhotoPreviewCard: React.FC<{ result: NSFWResult; compressionState?: CompressionState }> = ({ result, compressionState }) => {
  const { preview, isInappropriate, inappropriateReason, isAnalyzing, error } = result;
  const isTooLarge = compressionState?.status === 'too_large';

  return (
    <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
      {/* Image */}
      <img
        src={preview}
        alt="Preview"
        className={`w-full h-full object-cover ${isInappropriate || isTooLarge ? 'blur-xl' : ''}`}
      />

      {/* Overlay d'analyse */}
      {isAnalyzing && (
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin mb-2" />
          <span className="text-white text-sm font-medium">Analyse...</span>
        </div>
      )}

      {/* Overlay de compression en cours */}
      {compressionState?.status === 'compressing' && (
        <div className="absolute inset-0 bg-blue-500/70 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin mb-2" />
          <span className="text-white text-sm font-medium">Compression...</span>
        </div>
      )}

      {/* Overlay image trop volumineuse */}
      {isTooLarge && !isAnalyzing && (
        <div className="absolute inset-0 bg-red-600/90 flex flex-col items-center justify-center p-3">
          <ExclamationTriangleIcon className="w-10 h-10 text-white mb-2" />
          <span className="text-white text-sm font-semibold text-center">
            Trop volumineuse
          </span>
          {compressionState.error && (
            <span className="text-white/80 text-xs text-center mt-1">
              {compressionState.error}
            </span>
          )}
        </div>
      )}

      {/* Overlay d'erreur */}
      {error && !isTooLarge && (
        <div className="absolute inset-0 bg-red-500/80 flex flex-col items-center justify-center p-2">
          <ExclamationTriangleIcon className="w-8 h-8 text-white mb-2" />
          <span className="text-white text-xs text-center">{error}</span>
        </div>
      )}

      {/* Overlay de contenu inapproprié */}
      {isInappropriate && !isAnalyzing && !isTooLarge && (
        <div className="absolute inset-0 bg-red-600/90 flex flex-col items-center justify-center p-3">
          <ShieldExclamationIcon className="w-10 h-10 text-white mb-2" />
          <span className="text-white text-sm font-semibold text-center">
            Photo bloquée
          </span>
          {inappropriateReason && (
            <span className="text-white/80 text-xs text-center mt-1">
              {inappropriateReason}
            </span>
          )}
        </div>
      )}

      {/* Badge de validation */}
      {!isAnalyzing && !isInappropriate && !error && !isTooLarge && (
        <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
          <CheckCircleIcon className="w-4 h-4" />
        </div>
      )}

      {/* Badge taille du fichier */}
      {!isAnalyzing && !isInappropriate && !error && compressionState?.status === 'done' && compressionState.compressedSize !== undefined && compressionState.compressedSize < compressionState.originalSize && (
        <div className="absolute bottom-2 left-2 right-2 bg-black/60 text-white text-xs rounded-lg px-2 py-1 text-center">
          {formatFileSize(compressionState.originalSize)} → {formatFileSize(compressionState.compressedSize)}
        </div>
      )}

      {/* Taille originale si pas de compression */}
      {!isAnalyzing && !isInappropriate && !error && !isTooLarge && !compressionState && (
        <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs rounded-lg px-2 py-1">
          {formatFileSize(result.file.size)}
        </div>
      )}
    </div>
  );
};

export default PhotoUploadPreview;
