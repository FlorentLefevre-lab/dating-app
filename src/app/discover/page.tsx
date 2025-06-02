// src/app/discover/page.tsx - Frontend modifié pour l'API hybride
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HeartIcon, 
  XMarkIcon, 
  InformationCircleIcon,
  MapPinIcon,
  BriefcaseIcon,
  SparklesIcon,
  ArrowPathIcon,
  ClockIcon,
  FireIcon,
  StarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';

interface Profile {
  id: string;
  name: string;
  age: number;
  bio: string;
  location: string;
  department: string;
  region: string;
  profession: string;
  interests: string[];
  photos: Array<{
    id: string;
    url: string;
    isPrimary: boolean;
  }>;
  compatibilityScore: number;
  isOnline?: boolean;
  lastActive?: string;
}

interface AdvancedDiagnostic {
  totalProfiles: number;
  availableProfiles: number;
  cooldownProfiles: number;
  totalInteractions: number;
  cycleCount: number;
  nextAvailableIn: number; // heures
  timeSinceLastReset: number; // heures
  needsReset: boolean;
  needsMoreProfiles: boolean;
  recentStats: {
    likes: number;
    dislikes: number;
    superLikes: number;
  };
}

interface ApiResponse {
  success: boolean;
  profiles: Profile[];
  diagnostic: AdvancedDiagnostic;
  suggestions: {
    needsReset: boolean;
    needsMoreProfiles: boolean;
    canSmartReset: boolean;
    canFullReset: boolean;
    message: string;
  };
  metadata?: {
    algorithm: string;
    cycle: number;
    totalInteractions: number;
  };
}

// 🎯 COMPOSANT DE DIAGNOSTIC AVANCÉ
const HybridDiagnostic: React.FC<{
  diagnostic: AdvancedDiagnostic;
  suggestions: any;
  onSmartReset: () => void;
  onFullReset: () => void;
  isLoading: boolean;
}> = ({ diagnostic, suggestions, onSmartReset, onFullReset, isLoading }) => {
  const [showDetails, setShowDetails] = useState(false);

  if (diagnostic.availableProfiles > 8) return null;

  const formatTimeUntil = (hours: number) => {
    if (hours <= 0) return 'Maintenant';
    if (hours < 1) return `${Math.round(hours * 60)}min`;
    if (hours < 24) return `${Math.round(hours)}h`;
    return `${Math.round(hours / 24)}j`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4 mb-4 shadow-lg"
    >
      {/* Header avec cycle */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-blue-800 flex items-center">
          <ChartBarIcon className="w-5 h-5 mr-2" />
          Discovery Engine
        </h3>
        <div className="flex items-center space-x-2">
          <div className="bg-blue-100 px-2 py-1 rounded-full">
            <span className="text-xs font-semibold text-blue-700">
              Cycle {diagnostic.cycleCount}
            </span>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-blue-600 hover:text-blue-800 transition-colors"
          >
            <InformationCircleIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="text-center bg-white/60 rounded-lg p-2">
          <div className="text-lg font-bold text-green-600">{diagnostic.availableProfiles}</div>
          <div className="text-xs text-gray-600">Disponibles</div>
        </div>
        <div className="text-center bg-white/60 rounded-lg p-2">
          <div className="text-lg font-bold text-orange-600">{diagnostic.cooldownProfiles}</div>
          <div className="text-xs text-gray-600">Cooldown</div>
        </div>
        <div className="text-center bg-white/60 rounded-lg p-2">
          <div className="text-lg font-bold text-purple-600">{diagnostic.totalInteractions}</div>
          <div className="text-xs text-gray-600">Total vus</div>
        </div>
        <div className="text-center bg-white/60 rounded-lg p-2">
          <div className="text-lg font-bold text-pink-600">
            {diagnostic.recentStats.likes + diagnostic.recentStats.superLikes}
          </div>
          <div className="text-xs text-gray-600">Likes</div>
        </div>
      </div>

      {/* Détails expandables */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="bg-white/40 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Actions récentes:</span>
                <span className="font-medium">
                  👍 {diagnostic.recentStats.likes} · 
                  ⭐ {diagnostic.recentStats.superLikes} · 
                  👎 {diagnostic.recentStats.dislikes}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Dernier reset:</span>
                <span className="font-medium">{formatTimeUntil(diagnostic.timeSinceLastReset)} ago</span>
              </div>
              {diagnostic.nextAvailableIn > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Prochain profil:</span>
                  <span className="font-medium text-amber-600">
                    dans {formatTimeUntil(diagnostic.nextAvailableIn)}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message de statut */}
      <div className="bg-blue-100 rounded-lg p-3 mb-3">
        <p className="text-sm text-blue-800">{suggestions.message}</p>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        {suggestions.canSmartReset && diagnostic.availableProfiles <= 3 && (
          <button
            onClick={onSmartReset}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-2 px-4 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                Reset intelligent...
              </>
            ) : (
              <>
                <ClockIcon className="w-4 h-4 mr-2" />
                Reset intelligent ({diagnostic.cooldownProfiles} profils)
              </>
            )}
          </button>
        )}

        {suggestions.canFullReset && diagnostic.availableProfiles === 0 && (
          <button
            onClick={onFullReset}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-4 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                Reset complet...
              </>
            ) : (
              <>
                <FireIcon className="w-4 h-4 mr-2" />
                Nouveau cycle complet
              </>
            )}
          </button>
        )}
      </div>

      {/* Conseils */}
      {diagnostic.availableProfiles === 0 && diagnostic.nextAvailableIn > 0 && (
        <div className="mt-3 text-xs text-gray-600 bg-amber-50 border border-amber-200 rounded-lg p-2">
          ⏰ <strong>Patience :</strong> {diagnostic.cooldownProfiles} profils redeviendront disponibles progressivement.
          Le prochain dans {formatTimeUntil(diagnostic.nextAvailableIn)} !
        </div>
      )}
    </motion.div>
  );
};

// 🎯 COMPOSANT PRINCIPAL AMÉLIORÉ
export default function HybridDiscoverPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMatch, setIsMatch] = useState(false);
  const [matchUser, setMatchUser] = useState<{ id: string; name: string } | null>(null);
  
  // États pour le système hybride
  const [diagnostic, setDiagnostic] = useState<AdvancedDiagnostic | null>(null);
  const [suggestions, setSuggestions] = useState<any>(null);
  const [metadata, setMetadata] = useState<any>(null);

  const currentProfile = profiles[currentIndex];
  const nextProfile = profiles[currentIndex + 1];

  // 🎯 CHARGEMENT DES PROFILS AVEC DIAGNOSTIC
  const loadProfiles = async (resetType?: 'smart' | 'full', showDiagnostic = false) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (resetType) {
        params.append('reset', 'true');
        params.append('resetType', resetType);
      }
      if (showDiagnostic) {
        params.append('diagnostic', 'true');
      }

      const response = await fetch(`/api/discover?${params.toString()}`);
      const data: ApiResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erreur lors du chargement');
      }

      // Mettre à jour les états
      setProfiles(data.profiles || []);
      setDiagnostic(data.diagnostic);
      setSuggestions(data.suggestions);
      setMetadata(data.metadata);
      setCurrentIndex(0);

      console.log('📊 Données reçues:', {
        profiles: data.profiles?.length,
        diagnostic: data.diagnostic,
        suggestions: data.suggestions
      });

    } catch (err: any) {
      console.error('❌ Erreur chargement:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🎯 GESTION DES ACTIONS AVEC DÉTECTION DE MATCH
  const handleAction = async (action: 'like' | 'dislike' | 'super_like') => {
    if (!currentProfile) return;

    try {
      console.log(`💝 Action ${action} pour:`, currentProfile.name);

      // Marquer comme vu localement d'abord (pour la fluidité)
      setCurrentIndex(prev => prev + 1);

      // Envoyer l'action à l'API
      const response = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: currentProfile.id,
          action
        })
      });

      const result = await response.json();

      if (result.success) {
        // Vérifier s'il y a un match
        if (result.isMatch) {
          console.log('🎉 MATCH détecté !');
          setMatchUser({ id: currentProfile.id, name: currentProfile.name });
          setIsMatch(true);
        }

        // Recharger les profils si on arrive à la fin
        if (currentIndex >= profiles.length - 2) {
          console.log('📥 Rechargement automatique...');
          await loadProfiles();
        }
      } else {
        console.error('❌ Erreur API action:', result.error);
        setError(result.error);
        // Annuler le changement d'index en cas d'erreur
        setCurrentIndex(prev => Math.max(0, prev - 1));
      }

    } catch (error) {
      console.error('❌ Erreur réseau action:', error);
      setError('Erreur de connexion');
      // Annuler le changement d'index en cas d'erreur
      setCurrentIndex(prev => Math.max(0, prev - 1));
    }
  };

  // 🎯 GESTION DES RESETS
  const handleSmartReset = () => loadProfiles('smart');
  const handleFullReset = () => loadProfiles('full');
  const handleRefresh = () => loadProfiles();

  // Chargement initial
  useEffect(() => {
    loadProfiles();
  }, []);

  // 🎯 RENDU DES ÉTATS D'ERREUR ET CHARGEMENT
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">
            Recherche de profils compatibles...
            {metadata && (
              <span className="block text-sm text-gray-500 mt-1">
                Algorithme: {metadata.algorithm}
              </span>
            )}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="text-6xl mb-4">😞</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Oups !</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={handleRefresh}
              className="w-full bg-pink-500 text-white px-6 py-3 rounded-lg hover:bg-pink-600 transition-colors"
            >
              Réessayer
            </button>
            {suggestions?.canFullReset && (
              <button
                onClick={handleFullReset}
                className="w-full bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Reset complet
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 🎯 ÉTAT "AUCUN PROFIL"
  if (!currentProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="max-w-md mx-auto pt-8 px-4">
          {diagnostic && suggestions && (
            <HybridDiagnostic
              diagnostic={diagnostic}
              suggestions={suggestions}
              onSmartReset={handleSmartReset}
              onFullReset={handleFullReset}
              isLoading={loading}
            />
          )}
        </div>
        
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md mx-4">
            <div className="text-6xl mb-4">
              {diagnostic?.cooldownProfiles > 0 ? '⏰' : '🎯'}
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {diagnostic?.cooldownProfiles > 0 ? 'Profils en cooldown' : 'Plus de nouveaux profils'}
            </h2>
            <p className="text-gray-600 mb-6">
              {suggestions?.message || 'Utilisez les options ci-dessus pour continuer.'}
            </p>
            
            {diagnostic?.nextAvailableIn > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-center text-amber-800">
                  <ClockIcon className="w-5 h-5 mr-2" />
                  <span>
                    Prochain profil dans {diagnostic.nextAvailableIn < 1 ? 
                      `${Math.round(diagnostic.nextAvailableIn * 60)}min` : 
                      `${Math.round(diagnostic.nextAvailableIn)}h`}
                  </span>
                </div>
              </div>
            )}
            
            <button
              onClick={handleRefresh}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Actualiser
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 🎯 INTERFACE PRINCIPALE
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Diagnostic si nécessaire */}
      <div className="max-w-md mx-auto pt-4 px-4">
        {diagnostic && suggestions && (
          <HybridDiagnostic
            diagnostic={diagnostic}
            suggestions={suggestions}
            onSmartReset={handleSmartReset}
            onFullReset={handleFullReset}
            isLoading={loading}
          />
        )}
      </div>

      {/* Header amélioré */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            Découvrir
          </h1>
          <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-500">
              {currentIndex + 1} / {profiles.length}
            </div>
            {metadata && (
              <div className="bg-gradient-to-r from-pink-100 to-purple-100 px-2 py-1 rounded-full">
                <span className="text-xs font-semibold text-purple-700">
                  Cycle {metadata.cycle}
                </span>
              </div>
            )}
            {diagnostic && (
              <div className="text-xs text-gray-400">
                {diagnostic.availableProfiles} restants
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cards container */}
      <div className="max-w-md mx-auto h-[calc(100vh-80px)] relative">
        {/* Next card (background) */}
        {nextProfile && (
          <ProfileCard
            profile={nextProfile}
            onLike={() => {}}
            onDislike={() => {}}
            onSuperLike={() => {}}
            isTop={false}
          />
        )}

        {/* Current card (top) */}
        <ProfileCard
          profile={currentProfile}
          onLike={() => handleAction('like')}
          onDislike={() => handleAction('dislike')}
          onSuperLike={() => handleAction('super_like')}
          isTop={true}
        />
      </div>

      {/* Match Modal */}
      <MatchModal
        isOpen={isMatch}
        matchUser={matchUser}
        onClose={() => {
          setIsMatch(false);
          setMatchUser(null);
        }}
      />
    </div>
  );
}

// 🎯 COMPOSANT PROFILECARD AMÉLIORÉ
const ProfileCard: React.FC<{
  profile: Profile;
  onLike: () => void;
  onDislike: () => void;
  onSuperLike: () => void;
  isTop: boolean;
}> = ({ profile, onLike, onDislike, onSuperLike, isTop }) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  const primaryPhoto = profile.photos.find(photo => photo.isPrimary) || profile.photos[0];

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => 
      prev < profile.photos.length - 1 ? prev + 1 : 0
    );
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => 
      prev > 0 ? prev - 1 : profile.photos.length - 1
    );
  };

  return (
    <motion.div
      className={`absolute inset-4 bg-white rounded-2xl shadow-2xl overflow-hidden ${
        isTop ? 'z-20' : 'z-10 scale-95 opacity-50'
      }`}
      style={{
        backgroundImage: `url(${profile.photos[currentPhotoIndex]?.url || primaryPhoto?.url || 'https://via.placeholder.com/400x600/f3f4f6/9ca3af?text=Photo'})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      
      {/* Indicateur en ligne - NOUVEAU */}
      {profile.isOnline && (
        <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center z-30">
          <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
          En ligne
        </div>
      )}

      {/* Photo navigation */}
      {profile.photos.length > 1 && (
        <>
          <button
            onClick={prevPhoto}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white z-30 hover:bg-white/30 transition-colors"
          >
            ←
          </button>
          <button
            onClick={nextPhoto}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white z-30 hover:bg-white/30 transition-colors"
          >
            →
          </button>
          
          {/* Photo indicators */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-30">
            {profile.photos.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentPhotoIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}

      {/* Compatibility score - Position ajustée */}
      <div className={`absolute top-4 right-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center z-30 ${
        profile.isOnline ? 'mt-12' : ''
      }`}>
        <SparklesIcon className="w-4 h-4 mr-1" />
        {profile.compatibilityScore}%
      </div>

      {/* Profile info */}
      <div className="absolute bottom-0 left-0 right-0 p-6 text-white z-30">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold">
            {profile.name}, {profile.age}
          </h2>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
          >
            <InformationCircleIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center text-white/90 mb-2">
          <MapPinIcon className="w-4 h-4 mr-1" />
          <span className="text-sm">{profile.location}</span>
        </div>

        {profile.profession && (
          <div className="flex items-center text-white/90 mb-3">
            <BriefcaseIcon className="w-4 h-4 mr-1" />
            <span className="text-sm">{profile.profession}</span>
          </div>
        )}

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              {profile.bio && (
                <p className="text-sm text-white/90 mb-3 line-clamp-3">
                  {profile.bio}
                </p>
              )}
              
              {profile.interests.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {profile.interests.slice(0, 4).map((interest, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs"
                    >
                      {interest}
                    </span>
                  ))}
                  {profile.interests.length > 4 && (
                    <span className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs">
                      +{profile.interests.length - 4}
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons - AMÉLIORÉS */}
        <div className="flex justify-center space-x-4 mt-6">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onDislike}
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
          >
            <XMarkIcon className="w-6 h-6 text-gray-600" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onSuperLike}
            className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
          >
            <StarIcon className="w-6 h-6 text-white" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onLike}
            className="w-12 h-12 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
          >
            <HeartSolid className="w-6 h-6 text-white" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

// 🎯 COMPOSANT MATCH MODAL AMÉLIORÉ
const MatchModal: React.FC<{
  isOpen: boolean;
  matchUser: { id: string; name: string } | null;
  onClose: () => void;
}> = ({ isOpen, matchUser, onClose }) => {
  if (!isOpen || !matchUser) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 50 }}
          className="bg-white rounded-2xl p-8 mx-4 text-center max-w-md relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Animation de confettis CSS */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="absolute top-0 right-1/4 w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="absolute top-0 left-1/2 w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="text-6xl mb-4"
          >
            🎉
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-gray-800 mb-2"
          >
            C'est un Match !
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-gray-600 mb-6"
          >
            Vous et <span className="font-semibold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">{matchUser.name}</span> vous plaisez mutuellement !
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-3"
          >
            <button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white px-8 py-3 rounded-full font-semibold hover:from-pink-600 hover:to-rose-600 transition-all shadow-lg hover:shadow-xl"
            >
              Continuer à découvrir
            </button>
            
            <button
              onClick={() => {
                // TODO: Rediriger vers la conversation
                console.log('Redirection vers chat avec:', matchUser.id);
                onClose();
              }}
              className="w-full bg-white border-2 border-gray-200 text-gray-700 px-8 py-3 rounded-full font-semibold hover:bg-gray-50 transition-all"
            >
              Envoyer un message
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};