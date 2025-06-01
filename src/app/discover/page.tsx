// src/app/discover/page.tsx
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
  ArrowPathIcon
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
}

interface MatchModalProps {
  isOpen: boolean;
  matchUser: { id: string; name: string } | null;
  onClose: () => void;
}

const MatchModal: React.FC<MatchModalProps> = ({ isOpen, matchUser, onClose }) => {
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
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="bg-white rounded-2xl p-8 mx-4 text-center max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">C'est un Match !</h2>
          <p className="text-gray-600 mb-6">
            Vous et <span className="font-semibold text-pink-600">{matchUser.name}</span> vous plaisez mutuellement !
          </p>
          <button
            onClick={onClose}
            className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-8 py-3 rounded-full font-semibold hover:from-pink-600 hover:to-rose-600 transition-all"
          >
            Continuer à découvrir
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const ProfileCard: React.FC<{
  profile: Profile;
  onLike: () => void;
  onDislike: () => void;
  isTop: boolean;
}> = ({ profile, onLike, onDislike, isTop }) => {
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
      
      {/* Photo navigation */}
      {profile.photos.length > 1 && (
        <>
          <button
            onClick={prevPhoto}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white z-30"
          >
            ←
          </button>
          <button
            onClick={nextPhoto}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white z-30"
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

      {/* Compatibility score */}
      <div className="absolute top-4 right-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center z-30">
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
            className="p-2 bg-white/20 backdrop-blur-sm rounded-full"
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
                <div className="flex flex-wrap gap-2">
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

        {/* Action buttons */}
        <div className="flex justify-center space-x-6 mt-6">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onDislike}
            className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
          >
            <XMarkIcon className="w-7 h-7 text-gray-600" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onLike}
            className="w-14 h-14 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
          >
            <HeartSolid className="w-7 h-7 text-white" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default function DiscoverPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMatch, setIsMatch] = useState(false);
  const [matchUser, setMatchUser] = useState<{ id: string; name: string } | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const loadProfiles = async (reset = false) => {
    try {
      setLoading(true);
      setError(null);

      console.log('📥 Chargement des profils...', { reset });

      const url = reset ? '/api/discover?reset=true' : '/api/discover';
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des profils');
      }

      const data = await response.json();
      console.log('📊 Données reçues:', data);
      
      setProfiles(data.profiles || []);
      setCurrentIndex(0);

      if (data.profiles?.length === 0) {
        console.log('❌ Aucun profil disponible');
      } else {
        console.log('✅ Profils chargés:', data.profiles?.length);
      }

    } catch (err: any) {
      console.error('❌ Erreur chargement:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsResetting(true);
      console.log('🔄 Début du reset...');
      
      // Appeler l'API avec reset=true
      await loadProfiles(true);
      
      console.log('✅ Reset terminé');
    } catch (error) {
      console.error('❌ Erreur reset:', error);
      setError('Erreur lors de la réinitialisation');
    } finally {
      setIsResetting(false);
    }
  };

  const handleRefresh = async () => {
    console.log('🔄 Actualisation...');
    await loadProfiles(false);
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const handleAction = async (action: 'like' | 'dislike') => {
    const currentProfile = profiles[currentIndex];
    if (!currentProfile) return;

    console.log('🎯 Action:', action, 'pour:', currentProfile.name, '(ID:', currentProfile.id, ')');

    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUserId: currentProfile.id,
          action
        })
      });

      const result = await response.json();
      console.log('📥 Réponse de l\'API:', result);

      if (result.success) {
        // Afficher la modal de match si c'est un match
        if (result.isMatch) {
          console.log('🎉 MATCH avec:', currentProfile.name);
          setMatchUser({ id: currentProfile.id, name: currentProfile.name });
          setIsMatch(true);
        }

        // Passer au profil suivant
        setCurrentIndex(prev => prev + 1);

        // Charger plus de profils si on arrive à la fin
        if (currentIndex >= profiles.length - 2) {
          console.log('📥 Rechargement automatique des profils...');
          await loadProfiles();
        }
      } else {
        console.error('❌ Erreur de l\'API:', result.error);
        setError(result.error);
      }

    } catch (error) {
      console.error('❌ Erreur réseau lors de l\'action:', error);
      setError('Erreur de connexion');
    }
  };

  const currentProfile = profiles[currentIndex];
  const nextProfile = profiles[currentIndex + 1];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isResetting ? 'Réinitialisation en cours...' : 'Recherche de profils compatibles...'}
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
            <button
              onClick={handleReset}
              className="w-full bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Réinitialiser complètement
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="text-6xl mb-4">💔</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Plus de profils !</h2>
          <p className="text-gray-600 mb-6">
            Vous avez vu tous les profils disponibles. Réinitialisez pour revoir des profils ou revenez plus tard pour de nouveaux membres.
          </p>
          <div className="space-y-3">
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="w-full bg-pink-500 text-white px-6 py-3 rounded-lg hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isResetting ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                  Réinitialisation...
                </>
              ) : (
                <>
                  <ArrowPathIcon className="w-5 h-5 mr-2" />
                  Réinitialiser
                </>
              )}
            </button>
            <button
              onClick={handleRefresh}
              className="w-full bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Actualiser
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            Découvrir
          </h1>
          <div className="text-sm text-gray-500">
            {currentIndex + 1} / {profiles.length}
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
            isTop={false}
          />
        )}

        {/* Current card (top) */}
        <ProfileCard
          profile={currentProfile}
          onLike={() => handleAction('like')}
          onDislike={() => handleAction('dislike')}
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