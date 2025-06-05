'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { 
  CheckIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PencilIcon,
  IdentificationIcon,
  PhotoIcon,
  HeartIcon,
  CogIcon
} from '@heroicons/react/24/outline';

// Import des types
import type { UserProfile, TabType, MessageType } from '../types/profiles';

// Import des composants - avec des imports dynamiques en cas de problème
import dynamic from 'next/dynamic';

// Import statique d'abord, avec fallback dynamique si nécessaire
const ProfileOverview = dynamic(() => import('./profile/ProfileOverview'), {
  loading: () => <div className="p-6">Chargement...</div>
});

const BasicInfoForm = dynamic(() => import('./profile/BasicInfoForm'), {
  loading: () => <div className="p-6">Chargement...</div>
});

const PersonalInfoForm = dynamic(() => import('./profile/PersonalInfoForm'), {
  loading: () => <div className="p-6">Chargement...</div>
});

const PhotosManager = dynamic(() => import('./profile/PhotosManager'), {
  loading: () => <div className="p-6">Chargement...</div>
});

const PreferencesForm = dynamic(() => import('./profile/PreferencesForm'), {
  loading: () => <div className="p-6">Chargement...</div>
});

const SettingsPanel = dynamic(() => import('./profile/SettingsPanel'), {
  loading: () => <div className="p-6">Chargement...</div>
});

const ProfileManager: React.FC = () => {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<MessageType>('success');

  // Configuration des onglets
  const tabs = [
    { 
      id: 'overview' as TabType, 
      label: 'Aperçu', 
      icon: EyeIcon, 
      color: 'blue',
      description: 'Vue d\'ensemble de votre profil'
    },
    { 
      id: 'edit' as TabType, 
      label: 'Infos de base', 
      icon: PencilIcon, 
      color: 'green',
      description: 'Nom, âge, bio, localisation'
    },
    { 
      id: 'personal' as TabType, 
      label: 'Infos personnelles', 
      icon: IdentificationIcon, 
      color: 'purple',
      description: 'Genre, profession, centres d\'intérêt'
    },
    { 
      id: 'photos' as TabType, 
      label: 'Photos', 
      icon: PhotoIcon, 
      color: 'yellow',
      description: 'Gérer vos photos de profil'
    },
    { 
      id: 'preferences' as TabType, 
      label: 'Préférences', 
      icon: HeartIcon, 
      color: 'red',
      description: 'Critères de recherche'
    },
    { 
      id: 'settings' as TabType, 
      label: 'Paramètres', 
      icon: CogIcon, 
      color: 'gray',
      description: 'Confidentialité et sécurité'
    }
  ];

  // Chargement initial
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      
      // Simulation d'un appel API pour éviter les erreurs de build
      // Remplacer par votre vraie API
      const mockProfile: UserProfile = {
        id: '1',
        email: 'user@example.com',
        name: 'Utilisateur Test',
        age: 28,
        bio: 'Bio de test',
        location: 'Paris, France',
        interests: ['Sport', 'Voyage', 'Lecture'],
        photos: [],
        gender: 'homme',
        profession: 'ingenieur',
        maritalStatus: 'celibataire',
        zodiacSign: 'lion',
        dietType: 'omnivore',
        religion: 'autre',
        ethnicity: 'europeen',
        preferences: {
          minAge: 22,
          maxAge: 35,
          maxDistance: 50,
          gender: 'femme',
          lookingFor: 'relation-serieuse'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Remplacer par: const response = await fetch('/api/user-profile');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulation délai
      setProfile(mockProfile);
      
      console.log('✅ Profil chargé:', mockProfile);
    } catch (error) {
      console.error('❌ Erreur:', error);
      showMessage('Erreur lors du chargement du profil', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg: string, type: MessageType = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  // Calcul du pourcentage de complétion
  const getProfileCompletion = () => {
    if (!profile) return 0;
    
    const fields = [
      profile.name,
      profile.age,
      profile.bio,
      profile.location,
      profile.interests?.length > 0,
      profile.photos?.length > 0,
      profile.gender,
      profile.profession,
      profile.maritalStatus,
      profile.preferences?.minAge,
      profile.preferences?.maxAge,
      profile.preferences?.gender
    ];
    
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  };

  // Handlers pour les formulaires
  const handleBasicInfoSubmit = async (data: any) => {
    setSaving(true);
    try {
      // Simulation de sauvegarde
      console.log('💾 Sauvegarde des infos de base:', data);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mettre à jour le profil local
      if (profile) {
        setProfile({
          ...profile,
          ...data,
          updatedAt: new Date().toISOString()
        });
      }
      
      showMessage('✅ Informations de base sauvegardées !', 'success');
      setActiveTab('overview');
    } catch (error) {
      showMessage('❌ Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePersonalInfoSubmit = async (data: any) => {
    setSaving(true);
    try {
      console.log('💾 Sauvegarde des infos personnelles:', data);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (profile) {
        setProfile({
          ...profile,
          ...data,
          updatedAt: new Date().toISOString()
        });
      }
      
      showMessage('✅ Informations personnelles sauvegardées !', 'success');
      setActiveTab('overview');
    } catch (error) {
      showMessage('❌ Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePreferencesSubmit = async (data: any) => {
    setSaving(true);
    try {
      console.log('💾 Sauvegarde des préférences:', data);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (profile) {
        setProfile({
          ...profile,
          preferences: data,
          updatedAt: new Date().toISOString()
        });
      }
      
      showMessage('✅ Préférences sauvegardées !', 'success');
    } catch (error) {
      showMessage('❌ Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-6xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-96 bg-gray-200 rounded"></div>
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto p-6">
        
        {/* Header avec barre de progression */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-6"
        >
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent mb-2">
                  ✨ Gestion du Profil
                </h1>
                <p className="text-gray-600">
                  Gérez vos informations et préférences de rencontres
                </p>
              </div>
              
              {/* Indicateur de progression */}
              <div className="text-right">
                <div className="text-sm text-gray-500 mb-2">Profil complété</div>
                <div className="flex items-center gap-3">
                  <div className="relative w-20 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${getProfileCompletion()}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-pink-500 to-blue-500 rounded-full"
                    />
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent">
                      {getProfileCompletion()}%
                    </div>
                    <div className="text-xs text-gray-500">
                      {getProfileCompletion() === 100 ? 'Parfait !' : 'Continuez !'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation par onglets */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 bg-gradient-to-r from-gray-50 to-gray-100">
            {tabs.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <motion.button
                  key={tab.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center gap-2 p-4 border-b-2 transition-all duration-300 relative ${
                    isActive
                      ? 'border-pink-500 text-pink-600 bg-pink-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-pink-500' : ''}`} />
                  <div className="text-center">
                    <div className="font-medium text-xs">{tab.label}</div>
                    <div className="text-xs opacity-75 hidden lg:block">{tab.description}</div>
                  </div>
                  
                  {/* Indicateurs visuels */}
                  {tab.id === 'photos' && profile?.photos?.length && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs rounded-full bg-pink-500 text-white">
                      {profile.photos.length}
                    </span>
                  )}
                  
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Messages de feedback */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, x: -50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className={`p-4 rounded-xl mb-6 shadow-lg ${
                messageType === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {messageType === 'success' ? (
                  <CheckIcon className="w-6 h-6 text-green-600" />
                ) : (
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                )}
                <span className="font-medium">{message}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contenu principal */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-lg border border-gray-100"
          >
            {activeTab === 'overview' && (
              <ProfileOverview 
                profile={profile}
                onTabChange={setActiveTab}
                onMessage={showMessage}
              />
            )}

            {activeTab === 'edit' && (
              <BasicInfoForm 
                profile={profile}
                loading={saving}
                onSubmit={handleBasicInfoSubmit}
                onCancel={() => setActiveTab('overview')}
              />
            )}

            {activeTab === 'personal' && (
              <PersonalInfoForm 
                profile={profile}
                loading={saving}
                onSubmit={handlePersonalInfoSubmit}
                onCancel={() => setActiveTab('overview')}
              />
            )}

            {activeTab === 'photos' && (
              <PhotosManager 
                photos={profile?.photos || []}
                onMessage={showMessage}
              />
            )}

            {activeTab === 'preferences' && (
              <PreferencesForm 
                profile={profile}
                loading={saving}
                onSubmit={handlePreferencesSubmit}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsPanel 
                profile={profile}
                photos={profile?.photos || []}
                session={session}
                onMessage={showMessage}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ProfileManager;