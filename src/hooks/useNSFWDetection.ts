'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import * as nsfwjs from 'nsfwjs';

// Types pour les prédictions NSFW
export interface NSFWPrediction {
  className: 'Drawing' | 'Hentai' | 'Neutral' | 'Porn' | 'Sexy';
  probability: number;
}

export interface NSFWResult {
  file: File;
  preview: string;
  predictions: NSFWPrediction[];
  isInappropriate: boolean;
  inappropriateReason?: string;
  isAnalyzing: boolean;
  error?: string;
}

// Seuils de détection (ajustables)
export const NSFW_THRESHOLDS = {
  porn: 0.3,      // Seuil pour bloquer le contenu pornographique
  hentai: 0.3,    // Seuil pour bloquer le hentai
  sexy: 0.7,      // Seuil pour avertir sur le contenu suggestif (plus permissif)
};

interface UseNSFWDetectionOptions {
  autoLoad?: boolean;
  thresholds?: Partial<typeof NSFW_THRESHOLDS>;
}

export function useNSFWDetection(options: UseNSFWDetectionOptions = {}) {
  const { autoLoad = true, thresholds = {} } = options;

  const [model, setModel] = useState<nsfwjs.NSFWJS | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [results, setResults] = useState<NSFWResult[]>([]);
  const modelRef = useRef<nsfwjs.NSFWJS | null>(null);

  // Fusionner les seuils personnalisés avec les défauts
  const activeThresholds = { ...NSFW_THRESHOLDS, ...thresholds };

  // Charger le modèle NSFW.js
  const loadModel = useCallback(async () => {
    if (modelRef.current || isModelLoading) return modelRef.current;

    setIsModelLoading(true);
    setModelError(null);

    try {
      console.log('🔄 Chargement du modèle NSFW.js...');

      // Charger le modèle depuis le CDN (plus rapide, ~3MB)
      const loadedModel = await nsfwjs.load();

      modelRef.current = loadedModel;
      setModel(loadedModel);
      console.log('✅ Modèle NSFW.js chargé avec succès');

      return loadedModel;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('❌ Erreur chargement modèle NSFW:', error);
      setModelError(errorMessage);
      return null;
    } finally {
      setIsModelLoading(false);
    }
  }, [isModelLoading]);

  // Charger automatiquement le modèle au montage
  useEffect(() => {
    if (autoLoad && !modelRef.current && !isModelLoading) {
      loadModel();
    }
  }, [autoLoad, loadModel, isModelLoading]);

  // Analyser une image
  const analyzeImage = useCallback(async (
    file: File
  ): Promise<NSFWResult> => {
    const preview = URL.createObjectURL(file);

    // Résultat initial en cours d'analyse
    const initialResult: NSFWResult = {
      file,
      preview,
      predictions: [],
      isInappropriate: false,
      isAnalyzing: true,
    };

    try {
      // S'assurer que le modèle est chargé
      let currentModel = modelRef.current;
      if (!currentModel) {
        currentModel = await loadModel();
        if (!currentModel) {
          throw new Error('Impossible de charger le modèle de détection');
        }
      }

      // Créer un élément image pour l'analyse
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Impossible de charger l\'image'));
        img.src = preview;
      });

      // Analyser l'image
      const predictions = await currentModel.classify(img) as NSFWPrediction[];

      // Vérifier si l'image est inappropriée
      const pornScore = predictions.find(p => p.className === 'Porn')?.probability || 0;
      const hentaiScore = predictions.find(p => p.className === 'Hentai')?.probability || 0;
      const sexyScore = predictions.find(p => p.className === 'Sexy')?.probability || 0;

      let isInappropriate = false;
      let inappropriateReason: string | undefined;

      if (pornScore >= activeThresholds.porn) {
        isInappropriate = true;
        inappropriateReason = 'Contenu à caractère pornographique détecté';
      } else if (hentaiScore >= activeThresholds.hentai) {
        isInappropriate = true;
        inappropriateReason = 'Contenu inapproprié détecté';
      } else if (sexyScore >= activeThresholds.sexy) {
        // Pour le contenu "sexy", on avertit mais on ne bloque pas forcément
        // C'est une app de dating, un peu de contenu suggestif peut être OK
        // Mais au-dessus de 0.7, c'est probablement trop
        isInappropriate = true;
        inappropriateReason = 'Contenu trop suggestif détecté';
      }

      console.log(`📊 Analyse NSFW pour ${file.name}:`, {
        porn: (pornScore * 100).toFixed(1) + '%',
        hentai: (hentaiScore * 100).toFixed(1) + '%',
        sexy: (sexyScore * 100).toFixed(1) + '%',
        isInappropriate,
      });

      return {
        file,
        preview,
        predictions,
        isInappropriate,
        inappropriateReason,
        isAnalyzing: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur d\'analyse';
      console.error('❌ Erreur analyse NSFW:', error);

      return {
        file,
        preview,
        predictions: [],
        isInappropriate: false,
        isAnalyzing: false,
        error: errorMessage,
      };
    }
  }, [loadModel, activeThresholds]);

  // Analyser plusieurs images
  const analyzeImages = useCallback(async (files: File[]): Promise<NSFWResult[]> => {
    // Créer les résultats initiaux en cours d'analyse
    const initialResults: NSFWResult[] = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      predictions: [],
      isInappropriate: false,
      isAnalyzing: true,
    }));

    setResults(initialResults);

    // Analyser chaque image et mettre à jour les résultats au fur et à mesure
    const analyzedResults: NSFWResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const result = await analyzeImage(files[i]);
      analyzedResults.push(result);

      // Mettre à jour les résultats progressivement
      setResults(prev => {
        const updated = [...prev];
        updated[i] = result;
        return updated;
      });
    }

    return analyzedResults;
  }, [analyzeImage]);

  // Réinitialiser les résultats
  const clearResults = useCallback(() => {
    // Nettoyer les URLs de prévisualisation
    results.forEach(result => {
      if (result.preview) {
        URL.revokeObjectURL(result.preview);
      }
    });
    setResults([]);
  }, [results]);

  // Obtenir uniquement les images validées (non inappropriées)
  const getValidImages = useCallback(() => {
    return results.filter(r => !r.isInappropriate && !r.isAnalyzing && !r.error);
  }, [results]);

  // Obtenir les images bloquées
  const getBlockedImages = useCallback(() => {
    return results.filter(r => r.isInappropriate);
  }, [results]);

  // Nettoyer les URLs au démontage
  useEffect(() => {
    return () => {
      results.forEach(result => {
        if (result.preview) {
          URL.revokeObjectURL(result.preview);
        }
      });
    };
  }, []);

  return {
    // État du modèle
    model,
    isModelLoading,
    isModelReady: !!modelRef.current,
    modelError,
    loadModel,

    // Analyse
    analyzeImage,
    analyzeImages,

    // Résultats
    results,
    clearResults,
    getValidImages,
    getBlockedImages,

    // Stats
    totalImages: results.length,
    validCount: results.filter(r => !r.isInappropriate && !r.isAnalyzing && !r.error).length,
    blockedCount: results.filter(r => r.isInappropriate).length,
    analyzingCount: results.filter(r => r.isAnalyzing).length,

    // Seuils
    thresholds: activeThresholds,
  };
}

export default useNSFWDetection;
