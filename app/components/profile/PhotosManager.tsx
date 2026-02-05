'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PhotoIcon,
  TrashIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
  StarIcon,
  CameraIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
  ShieldCheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

import { Photo, PhotosManagerProps } from '@/types/profiles';
import { PHOTO_CONFIG, getMaxPhotos } from '@/lib/config/photos';
import { compressImage } from '@/lib/imageCompression';

// Déclaration TypeScript pour Cloudinary
declare global {
  interface Window {
    cloudinary: any;
  }
}

// Fonction pour générer la signature Cloudinary (uploads signés)
const generateSignature = async (callback: (signature: string) => void, paramsToSign: Record<string, any>) => {
  try {
    const response = await fetch('/api/cloudinary/signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paramsToSign }),
    });
    const data = await response.json();
    callback(data.signature);
  } catch (error) {
    console.error('Error generating signature:', error);
  }
};

const PhotosManager: React.FC<PhotosManagerProps> = ({
  photos,
  onMessage,
  onPhotosChange,
  isPremium = false
}) => {
  const [localPhotos, setLocalPhotos] = useState<Photo[]>(photos);
  const [uploading, setUploading] = useState(false);
  const [cloudinaryLoaded, setCloudinaryLoaded] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<number>(0);
  const [skippedPhotos, setSkippedPhotos] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [dragOver, setDragOver] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calcul du max photos selon le statut premium (depuis config centralisée)
  const MAX_PHOTOS = getMaxPhotos(isPremium);
  const MAX_PHOTOS_PREMIUM = PHOTO_CONFIG.maxPhotosPremium;
  const PHOTOS_PER_PAGE = PHOTO_CONFIG.photosPerPage;

  // Calcul de la pagination
  const totalPages = Math.ceil(localPhotos.length / PHOTOS_PER_PAGE);
  const paginatedPhotos = useMemo(() => {
    const startIndex = (currentPage - 1) * PHOTOS_PER_PAGE;
    const endIndex = startIndex + PHOTOS_PER_PAGE;
    return localPhotos.slice(startIndex, endIndex);
  }, [localPhotos, currentPage]);

  // Reset page when photos change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Synchroniser avec les props
  useEffect(() => {
    setLocalPhotos(photos);
    loadPhotosFromAPI();
  }, [photos]);

  // Charger le script Cloudinary
  useEffect(() => {
    const loadCloudinaryWidget = () => {
      if (window.cloudinary) {
        setCloudinaryLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://widget.cloudinary.com/v2.0/global/all.js';
      script.async = true;
      script.onload = () => {
        setCloudinaryLoaded(true);
        console.log('✅ Cloudinary widget chargé');
      };
      script.onerror = () => {
        console.error('❌ Erreur chargement Cloudinary widget');
        onMessage('Erreur de chargement du widget photo', 'error');
      };
      document.head.appendChild(script);
    };

    loadCloudinaryWidget();
  }, [onMessage]);

  // Charger les photos depuis l'API
  const loadPhotosFromAPI = async () => {
    try {
      const response = await fetch('/api/profile/photos');

      if (response.ok) {
        const data = await response.json();
        const apiPhotos = data.photos || [];
        setLocalPhotos(apiPhotos);
      }
    } catch (error) {
      console.error('❌ Erreur chargement photos:', error);
    }
  };

  // Uploader les fichiers validés vers Cloudinary
  const uploadValidatedFiles = async (files: File[]) => {
    setUploading(true);
    setUploadQueue(files.length);

    let successCount = 0;
    const errors: string[] = [];

    for (const file of files) {
      // Vérifier qu'on n'a pas dépassé la limite
      if (localPhotos.length + successCount >= MAX_PHOTOS) {
        errors.push(`${file.name} — Limite de ${MAX_PHOTOS} photos atteinte. Supprimez des photos existantes pour en ajouter de nouvelles.`);
        break;
      }

      try {
        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch('/api/cloudinary/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          const serverMsg = errorData.error || 'Erreur inconnue du serveur';
          throw new Error(serverMsg);
        }

        const { url } = await uploadResponse.json();

        await savePhotoToDatabase(url);
        successCount++;

      } catch (error: any) {
        console.error('❌ Erreur upload fichier:', error);
        const reason = error?.message || 'Erreur inconnue';
        errors.push(`${file.name} (${formatSize(file.size)}) — Échec de l'upload : ${reason}`);
      }

      setUploadQueue(prev => Math.max(0, prev - 1));
    }

    setUploading(false);
    setUploadQueue(0);

    if (successCount > 0) {
      onMessage(`${successCount} photo${successCount > 1 ? 's' : ''} ajoutée${successCount > 1 ? 's' : ''} avec succès !`, 'success');
    }
    if (errors.length > 0) {
      console.log('⚠️ Erreurs upload:', errors);
      setUploadErrors(prev => [...prev, ...errors]);
    }
  };

  // Filtrer les fichiers images valides
  const filterImageFiles = (fileList: FileList | File[]): File[] => {
    const acceptedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    return Array.from(fileList)
      .filter(file => {
        const isValidType = acceptedMimeTypes.includes(file.type.toLowerCase());
        const isValidExtension = PHOTO_CONFIG.allowedFormats.some(
          format => file.name.toLowerCase().endsWith(`.${format}`)
        );
        return isValidType || isValidExtension;
      })
      .slice(0, Math.min(remainingSlots, PHOTO_CONFIG.maxPhotosFree));
  };

  // Formater une taille en Mo lisible
  const formatSize = (bytes: number): string => {
    return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
  };

  // Compresser puis uploader les fichiers directement
  const processAndUploadFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setUploadErrors([]);
    setUploading(true);
    setUploadQueue(files.length);

    const filesToUpload: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const result = await compressImage(file);
        if (result) {
          filesToUpload.push(result.file);
        } else {
          const sizeMo = formatSize(file.size);
          const isGif = file.type === 'image/gif';
          errors.push(
            isGif
              ? `${file.name} (${sizeMo}) — Les GIF animés ne peuvent pas être compressés automatiquement. Utilisez un GIF de moins de 2 Mo ou convertissez-le en JPEG/PNG.`
              : `${file.name} (${sizeMo}) — L'image est trop volumineuse. Malgré la compression automatique (réduction de qualité et de résolution), elle dépasse toujours la limite de 2 Mo. Recadrez ou réduisez la résolution de l'image avant de réessayer.`
          );
        }
      } catch {
        errors.push(
          `${file.name} — Une erreur est survenue lors de la compression. Vérifiez que le fichier est une image valide (JPEG, PNG ou GIF).`
        );
      }
    }

    if (errors.length > 0) {
      console.log('⚠️ Erreurs compression:', errors);
      setUploadErrors(errors);
    }

    if (filesToUpload.length > 0) {
      await uploadValidatedFiles(filesToUpload);
    } else {
      setUploading(false);
      setUploadQueue(0);
    }
  };

  // Quand des fichiers sont sélectionnés via l'input
  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const imageFiles = filterImageFiles(files);
    // Reset l'input pour pouvoir re-sélectionner les mêmes fichiers
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    processAndUploadFiles(imageFiles);
  };

  // Drag & drop sur la zone d'upload
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const imageFiles = filterImageFiles(e.dataTransfer.files);
    processAndUploadFiles(imageFiles);
  };

  // Ouvrir le widget Cloudinary
  const openCloudinaryWidget = () => {
    if (!cloudinaryLoaded || !window.cloudinary) {
      onMessage('Widget photo en cours de chargement...', 'error');
      return;
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;

    console.log('🔧 Cloudinary config:', { cloudName, apiKey: apiKey ? '***' + apiKey.slice(-4) : 'missing' });

    if (!cloudName || cloudName === 'your-cloud-name') {
      console.error('❌ Configuration Cloudinary invalide:', { cloudName });
      onMessage('Configuration Cloudinary manquante ou invalide', 'error');
      return;
    }

    if (!apiKey) {
      console.error('❌ API Key Cloudinary manquante');
      onMessage('API Key Cloudinary manquante', 'error');
      return;
    }

    const remainingSlots = MAX_PHOTOS - localPhotos.length;
    let uploadedCount = 0;
    let totalSelected = 0;

    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: cloudName,
        // Pour les uploads signés, pas de uploadPreset
        sources: ['local', 'camera', 'image_search', 'url'],
        multiple: true,
        maxFiles: remainingSlots,
        maxFileSize: 2000000, // 2MB
        resourceType: 'image',
        clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif'],
        maxImageWidth: 2000,
        maxImageHeight: 2000,
        cropping: false,
        folder: 'dating_app_photos',
        theme: 'minimal',
        // Compression automatique forte
        eager: [
          { quality: 'auto:low', fetch_format: 'auto' }
        ],
        transformation: [
          { quality: 'auto:eco', fetch_format: 'auto' }
        ],
        // Configuration pour upload signé
        apiKey: apiKey,
        uploadSignature: generateSignature,
        text: {
          fr: {
            or: 'ou',
            back: 'Retour',
            close: 'Fermer',
            no_results: 'Aucun résultat',
            search_placeholder: 'Rechercher...',
            about_uw: 'À propos du widget',
            search: {
              placeholder: 'Rechercher des images...',
              reset: 'Réinitialiser'
            },
            menu: {
              files: 'Mes fichiers',
              web: 'Adresse Web',
              camera: 'Caméra',
              url: 'URL',
              image_search: 'Recherche d\'images'
            },
            local: {
              browse: 'Parcourir',
              main_title: 'Télécharger des fichiers',
              dd_title_single: 'Glissez une image ici',
              dd_title_multi: `Glissez jusqu'à ${remainingSlots} images ici`,
              drop_title_single: 'Déposez l\'image pour la télécharger',
              drop_title_multi: 'Déposez les images pour les télécharger'
            },
            url: {
              main_title: 'Adresse Web distante',
              inner_title: 'URL publique de l\'image :',
              input_placeholder: 'https://exemple.com/image.jpg'
            },
            camera: {
              main_title: 'Prendre une photo',
              capture: 'Capturer',
              cancel: 'Annuler',
              take_pic: 'Prendre une photo',
              explanation: 'Assurez-vous que votre caméra est connectée et que vous avez autorisé l\'accès.',
              camera_error: 'Impossible d\'accéder à la caméra',
              retry: 'Réessayer',
              file_name: 'Photo_Camera'
            },
            image_search: {
              main_title: 'Recherche d\'images',
              inputPlaceholder: 'Rechercher des images...',
              customPlaceholder: 'Rechercher...',
              show_more: 'Voir plus'
            },
            queue: {
              title: 'File d\'attente',
              title_uploading: 'Téléchargement des fichiers',
              title_uploading_with_counter: 'Téléchargement de {{num}} fichier(s)...',
              mini_title: 'Téléchargé',
              mini_title_uploading: 'Téléchargement...',
              mini_title_processing: 'Traitement...',
              show_completed: 'Afficher les fichiers terminés',
              retry_failed: 'Réessayer les échecs',
              abort_all: 'Tout annuler',
              upload_more: 'Ajouter d\'autres fichiers',
              done: 'Terminé',
              statuses: {
                uploading: 'Téléchargement...',
                processing: 'Traitement...',
                timeout: 'Délai dépassé',
                error: 'Erreur',
                uploaded: 'Terminé',
                aborted: 'Annulé'
              }
            },
            crop: {
              title: 'Recadrer',
              crop_btn: 'Recadrer',
              skip_btn: 'Passer',
              reset_btn: 'Réinitialiser',
              close_btn: 'Fermer',
              close_prompt: 'Fermer annulera tous les téléchargements. Êtes-vous sûr ?',
              no_image: 'Aucune image sélectionnée'
            },
            actions: {
              upload: 'Télécharger',
              next: 'Suivant',
              clear_all: 'Tout effacer',
              log_out: 'Se déconnecter'
            },
            notifications: {
              general_error: 'Une erreur s\'est produite',
              general_prompt: 'Êtes-vous sûr ?',
              limit_reached: 'Limite atteinte',
              invalid_add_url: 'URL invalide',
              invalid_public_id: 'ID public invalide',
              no_new_files: 'Les fichiers ont déjà été téléchargés',
              image_purchased: 'Image achetée',
              video_purchased: 'Vidéo achetée',
              purchase_failed: 'Achat échoué. Veuillez réessayer.',
              service_logged_out: 'Service déconnecté en raison d\'une erreur',
              great: 'Super',
              image_search_blurb: 'Images fournies par',
              search_ok: 'OK'
            },
            errors: {
              file_too_large: 'Fichier trop volumineux ({{size}} Mo max)',
              allowed_formats: 'Format non autorisé. Formats acceptés : JPEG, PNG, GIF',
              max_number_of_files: 'Nombre maximum de fichiers atteint',
              not_allowed: 'Action non autorisée'
            }
          }
        },
        language: 'fr',
        styles: {
          palette: {
            window: '#ffffff',
            sourceBg: '#f8fafc',
            windowBorder: '#e5e7eb',
            tabIcon: '#ec4899',
            inactiveTabIcon: '#9ca3af',
            menuIcons: '#6b7280',
            link: '#ec4899',
            action: '#ec4899',
            inProgress: '#ec4899',
            complete: '#10b981',
            error: '#ef4444',
            textDark: '#1f2937',
            textLight: '#6b7280'
          },
          fonts: {
            default: null,
            "'Inter', sans-serif": {
              url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
              active: true
            }
          }
        }
      },
      (error: any, result: any) => {
        if (error) {
          console.error('❌ Erreur widget Cloudinary:', JSON.stringify(error, null, 2));
          console.error('❌ Error details:', error?.message || error?.statusText || 'Unknown error');
          onMessage(`Erreur upload: ${error?.message || error?.statusText || 'Vérifiez votre configuration Cloudinary'}`, 'error');
          setUploading(false);
          return;
        }

        if (result) {
          console.log('📸 Cloudinary event:', result.event, result);
        }

        // Quand l'utilisateur sélectionne des fichiers
        if (result && result.event === 'queues-start') {
          totalSelected = result.info?.files?.length || 0;
          setUploadQueue(totalSelected);
          setUploading(true);

          // Vérifier si trop de fichiers sélectionnés
          if (totalSelected > remainingSlots) {
            const skipped = totalSelected - remainingSlots;
            setSkippedPhotos(skipped);
            onMessage(`⚠️ ${skipped} photo(s) ignorée(s) - Limite de ${MAX_PHOTOS} photos atteinte`, 'warning');
          }
        }

        if (result && result.event === 'success') {
          uploadedCount++;

          // Vérifier qu'on n'a pas dépassé la limite
          if (localPhotos.length + uploadedCount <= MAX_PHOTOS) {
            savePhotoToDatabase(result.info.secure_url);
          } else {
            console.warn('⚠️ Photo ignorée - limite atteinte');
          }

          setUploadQueue(prev => Math.max(0, prev - 1));
        }

        if (result && result.event === 'queues-end') {
          setUploading(false);
          setUploadQueue(0);

          if (skippedPhotos > 0) {
            setSkippedPhotos(0);
          }
        }

        if (result && result.event === 'close') {
          setUploading(false);
          setUploadQueue(0);
        }
      }
    );

    widget.open();
  };

  // Sauvegarder en base de données
  const savePhotoToDatabase = async (imageUrl: string) => {
    try {
      const response = await fetch('/api/profile/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: imageUrl,
          isPrimary: localPhotos.length === 0
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur base de données: ${response.status}`);
      }

      const savedPhoto = await response.json();
      setLocalPhotos(prev => [...prev, savedPhoto]);
      onMessage('Photo ajoutée avec succès !', 'success');

      // Notifier le parent pour rafraîchir le profil
      if (onPhotosChange) {
        onPhotosChange();
      }

      // Émettre un événement pour mettre à jour la navbar
      window.dispatchEvent(new CustomEvent('profile-photo-updated'));

    } catch (error: any) {
      console.error('❌ Erreur sauvegarde photo:', error);
      onMessage(`Erreur: ${error.message}`, 'error');
    }
  };

  // Supprimer une photo
  const deletePhoto = async (photoId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette photo ?')) return;

    try {
      const response = await fetch(`/api/profile/photos/${photoId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      setLocalPhotos(prev => prev.filter(p => p.id !== photoId));
      onMessage('Photo supprimée', 'success');

      // Notifier le parent pour rafraîchir le profil
      if (onPhotosChange) {
        onPhotosChange();
      }

      // Émettre un événement pour mettre à jour la navbar
      window.dispatchEvent(new CustomEvent('profile-photo-updated'));
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      onMessage('Erreur lors de la suppression', 'error');
    }
  };

  // Définir photo principale
  const setPrimaryPhoto = async (photoId: string) => {
    try {
      const response = await fetch(`/api/profile/photos/${photoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrimary: true }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour');
      }

      setLocalPhotos(prev => prev.map(p => ({
        ...p,
        isPrimary: p.id === photoId
      })));
      onMessage('Photo principale mise à jour', 'success');

      // Notifier le parent pour rafraîchir le profil
      if (onPhotosChange) {
        onPhotosChange();
      }

      // Émettre un événement pour mettre à jour la navbar
      window.dispatchEvent(new CustomEvent('profile-photo-updated'));
    } catch (error) {
      console.error('❌ Erreur photo principale:', error);
      onMessage('Erreur lors de la mise à jour', 'error');
    }
  };

  const canAddMore = localPhotos.length < MAX_PHOTOS;
  const remainingSlots = MAX_PHOTOS - localPhotos.length;

  // Navigation pagination
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Générer les numéros de page à afficher
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="form-section">
      {/* Header */}
      <div className="form-section-header">
        <div className="flex items-center gap-2">
          <h2 className="form-section-title">
            Mes Photos ({localPhotos.length}/{MAX_PHOTOS})
          </h2>
          {isPremium && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-semibold rounded-full">
              <SparklesIcon className="w-3 h-3" />
              Premium
            </span>
          )}
        </div>
        <p className="form-section-subtitle">
          Ajoutez jusqu'à {MAX_PHOTOS} photos pour attirer l'attention
          {canAddMore && (
            <span className="text-pink-500 ml-1">
              ({remainingSlots} emplacement{remainingSlots > 1 ? 's' : ''} disponible{remainingSlots > 1 ? 's' : ''})
            </span>
          )}
        </p>
        {!isPremium && (
          <p className="text-xs text-gray-500 mt-1">
            <SparklesIcon className="w-3 h-3 inline mr-1 text-amber-500" />
            Passez Premium pour ajouter jusqu'à {MAX_PHOTOS_PREMIUM} photos
          </p>
        )}
      </div>

      {/* Input fichier caché */}
      <input
        ref={fileInputRef}
        id="photo-file-input"
        type="file"
        accept="image/jpeg,image/png,image/gif"
        multiple
        onChange={handleFilesSelected}
        className="hidden"
      />

      {/* Zone d'upload : clic = file picker natif via label, drag & drop */}
      {canAddMore && (
        <div className="mb-8">
          {uploading ? (
            <div className="upload-area disabled">
              <div className="flex flex-col items-center justify-center">
                <div className="loading-spinner mb-3"></div>
                <span className="text-gray-600 font-medium">
                  Upload en cours...{uploadQueue > 0 && ` (${uploadQueue} restante${uploadQueue > 1 ? 's' : ''})`}
                </span>
                <span className="text-sm text-gray-500">Traitement de vos photos</span>
              </div>
            </div>
          ) : (
            <label
              htmlFor="photo-file-input"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`upload-area block cursor-pointer ${
                dragOver ? 'ring-2 ring-pink-500 !bg-pink-50 !border-pink-500' : ''
              }`}
            >
              <div className="flex flex-col items-center justify-center">
                <div className="flex items-center gap-3 mb-3">
                  <CameraIcon className="w-10 h-10 text-pink-500" />
                  <ArrowUpTrayIcon className="w-10 h-10 text-pink-500" />
                </div>
                <span className="text-gray-700 font-semibold text-lg mb-1">
                  {dragOver ? 'Déposez vos photos ici' : 'Glissez vos photos ici'}
                </span>
                <span className="text-gray-500">
                  ou cliquez pour parcourir (max {remainingSlots} photo{remainingSlots > 1 ? 's' : ''})
                </span>
                <div className="flex items-center gap-1 text-xs text-green-600 mt-2">
                  <ShieldCheckIcon className="w-4 h-4" />
                  <span>Protection contre le contenu inapproprié</span>
                </div>
                <span className="text-xs text-gray-400 mt-1">
                  Formats acceptés : JPEG, PNG, GIF - 2 Mo max par image
                </span>
              </div>
            </label>
          )}
        </div>
      )}

      {/* Erreurs de compression / taille affichées inline */}
      {uploadErrors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h4 className="font-semibold text-red-800 mb-2">
                  {uploadErrors.length === 1
                    ? 'Une photo n\'a pas pu être ajoutée'
                    : `${uploadErrors.length} photos n'ont pas pu être ajoutées`}
                </h4>
                <ul className="space-y-2">
                  {uploadErrors.map((error, i) => (
                    <li key={i} className="text-sm text-red-700 leading-snug">
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <button
              onClick={() => setUploadErrors([])}
              className="p-1 text-red-400 hover:text-red-600 flex-shrink-0"
              title="Fermer"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Grille des photos avec pagination */}
      {localPhotos.length > 0 ? (
        <div className="mb-6">
          {/* Grille des photos */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-2 rounded-xl">
            <AnimatePresence mode="popLayout">
              {paginatedPhotos.map((photo, index) => {
                const globalIndex = (currentPage - 1) * PHOTOS_PER_PAGE + index;
                return (
                  <motion.div
                    key={photo.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ scale: 1.02 }}
                    className="photo-card"
                  >
                    <img
                      src={photo.url}
                      alt={`Photo ${globalIndex + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {/* Badge photo principale */}
                    {photo.isPrimary && (
                      <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                        <StarIcon className="w-3 h-3" />
                        Principale
                      </div>
                    )}

                    {/* Numéro de la photo */}
                    <div className="absolute top-3 right-3 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold">
                      {globalIndex + 1}
                    </div>

                    {/* Overlay avec actions */}
                    <div className="photo-overlay">
                      <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
                        {/* Bouton définir comme principale */}
                        {!photo.isPrimary && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setPrimaryPhoto(photo.id)}
                            className="bg-white/90 backdrop-blur-sm text-gray-700 p-2.5 rounded-lg hover:bg-white transition-all shadow-lg"
                            title="Définir comme photo principale"
                          >
                            <StarIcon className="w-4 h-4" />
                          </motion.button>
                        )}

                        {/* Bouton supprimer */}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => deletePhoto(photo.id)}
                          className="bg-red-500/90 backdrop-blur-sm text-white p-2.5 rounded-lg hover:bg-red-600 transition-all shadow-lg ml-auto"
                          title="Supprimer cette photo"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {/* Bouton précédent */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg transition-all ${
                  currentPage === 1
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-pink-100 hover:text-pink-600'
                }`}
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </motion.button>

              {/* Numéros de page */}
              <div className="flex items-center gap-1">
                {getPageNumbers().map((page, index) => (
                  <React.Fragment key={index}>
                    {page === '...' ? (
                      <span className="px-2 text-gray-400">...</span>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => goToPage(page as number)}
                        className={`w-10 h-10 rounded-lg font-medium transition-all ${
                          currentPage === page
                            ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg'
                            : 'text-gray-600 hover:bg-pink-100 hover:text-pink-600'
                        }`}
                      >
                        {page}
                      </motion.button>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Bouton suivant */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg transition-all ${
                  currentPage === totalPages
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-pink-100 hover:text-pink-600'
                }`}
              >
                <ChevronRightIcon className="w-5 h-5" />
              </motion.button>
            </div>
          )}

          {/* Info pagination */}
          {totalPages > 1 && (
            <p className="text-center text-sm text-gray-500 mt-2">
              Page {currentPage} sur {totalPages} • {localPhotos.length} photo{localPhotos.length > 1 ? 's' : ''} au total
            </p>
          )}
        </div>
      ) : (
        // État vide
        <div className="text-center py-16 mb-6">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <PhotoIcon className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Aucune photo ajoutée
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Commencez par ajouter quelques photos pour créer un profil attractif !
          </p>
        </div>
      )}

      {/* Alerte limite atteinte */}
      {!canAddMore && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="alert alert-warning mb-6"
        >
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-800 mb-1">
                Limite de {MAX_PHOTOS} photos atteinte
              </h4>
              <p className="text-amber-700 text-sm">
                Vous avez ajouté le maximum de {MAX_PHOTOS} photos. Pour en ajouter de nouvelles,
                supprimez d'abord une photo existante.
                {!isPremium && (
                  <span className="block mt-1">
                    <SparklesIcon className="w-4 h-4 inline mr-1" />
                    Passez Premium pour avoir jusqu'à {MAX_PHOTOS_PREMIUM} photos !
                  </span>
                )}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Conseils pour de meilleures photos */}
      <div className="info-box">
        <h4 className="info-box-title">
          💡 Conseils pour de meilleures photos
        </h4>
        <ul className="info-box-text space-y-2">
          <li>• Utilisez des photos récentes et de bonne qualité</li>
          <li>• Montrez votre visage clairement sur votre photo principale</li>
          <li>• Variez les types de photos : portrait, corps entier, activités</li>
          <li>• Évitez les filtres trop prononcés</li>
          <li>• Souriez naturellement !</li>
          <li>• Formats acceptés : JPEG, PNG et GIF uniquement</li>
          <li>• 2 Mo maximum par photo (compression automatique appliquée)</li>
        </ul>
      </div>

    </div>
  );
};

export default PhotosManager;
