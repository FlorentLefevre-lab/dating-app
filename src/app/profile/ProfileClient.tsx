// src/app/profile/ProfileClient.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  UserIcon, 
  PhotoIcon, 
  Cog6ToothIcon, 
  HeartIcon,
  InformationCircleIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

// Import des composants existants
import ProfileOverview from '@/components/profile/ProfileOverview'
import BasicInfoForm from '@/components/profile/BasicInfoForm'
import PersonalInfoForm from '@/components/profile/PersonalInfoForm'
import PhotosManager from '@/components/profile/PhotosManager'
import PreferencesForm from '@/components/profile/PreferencesForm'
import SettingsPanel from '@/components/profile/SettingsPanel'

interface ProfileClientProps {
  session: any
}

interface Photo {
  id: string
  url: string
  isPrimary: boolean
  createdAt: string
}

interface UserProfile {
  id: string
  name: string | null
  age: number | null
  bio: string | null
  location: string | null
  department: string | null
  region: string | null
  postcode: string | null
  profession: string | null
  gender: string | null
  maritalStatus: string | null
  zodiacSign: string | null
  dietType: string | null
  religion: string | null
  ethnicity: string | null
  interests: string[]
  preferences?: any
  email?: string
  createdAt?: string
  updatedAt?: string
}

export default function ProfileClient({ session }: ProfileClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Charger le profil au montage
  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      console.log('🔄 Chargement du profil...')
      
      const response = await fetch('/api/profile')
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Profil chargé:', data)
        
        setProfile(data.profile)
        setPhotos(data.photos || [])
      } else {
        console.error('❌ Erreur chargement profil:', response.status)
        showMessage('Erreur lors du chargement du profil', 'error')
      }
    } catch (error) {
      console.error('❌ Erreur chargement profil:', error)
      showMessage('Erreur lors du chargement du profil', 'error')
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 5000)
  }

  // Sauvegarder les informations de base
  const handleBasicInfoSubmit = async (data: any) => {
    setSaving(true)
    try {
      console.log('📤 Sauvegarde infos de base:', data)
      
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        const updatedProfile = await response.json()
        setProfile(updatedProfile)
        showMessage('Informations sauvegardées avec succès !', 'success')
        setActiveTab('overview')
      } else {
        const error = await response.json()
        showMessage(error.error || 'Erreur lors de la sauvegarde', 'error')
      }
    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error)
      showMessage('Erreur lors de la sauvegarde', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Sauvegarder les informations personnelles
  const handlePersonalInfoSubmit = async (data: any) => {
    setSaving(true)
    try {
      console.log('📤 Sauvegarde infos personnelles:', data)
      
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        const updatedProfile = await response.json()
        setProfile(updatedProfile)
        showMessage('Informations personnelles sauvegardées !', 'success')
        setActiveTab('overview')
      } else {
        const error = await response.json()
        showMessage(error.error || 'Erreur lors de la sauvegarde', 'error')
      }
    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error)
      showMessage('Erreur lors de la sauvegarde', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Sauvegarder les préférences
  const handlePreferencesSubmit = async (data: any) => {
    setSaving(true)
    try {
      console.log('📤 Sauvegarde préférences:', data)
      
      const response = await fetch('/api/profile/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        showMessage('Préférences sauvegardées !', 'success')
        await loadProfile() // Recharger pour récupérer les préférences
        setActiveTab('overview')
      } else {
        const error = await response.json()
        showMessage(error.error || 'Erreur lors de la sauvegarde', 'error')
      }
    } catch (error) {
      console.error('❌ Erreur sauvegarde préférences:', error)
      showMessage('Erreur lors de la sauvegarde des préférences', 'error')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { 
      id: 'overview', 
      name: 'Vue d\'ensemble', 
      icon: UserIcon,
      description: 'Aperçu de votre profil'
    },
    { 
      id: 'edit', 
      name: 'Infos de base', 
      icon: InformationCircleIcon,
      description: 'Nom, âge, bio, localisation'
    },
    { 
      id: 'personal', 
      name: 'Infos personnelles', 
      icon: UserIcon,
      description: 'Genre, profession, centres d\'intérêt'
    },
    { 
      id: 'photos', 
      name: 'Photos', 
      icon: PhotoIcon,
      description: 'Gérer vos photos de profil'
    },
    { 
      id: 'preferences', 
      name: 'Préférences', 
      icon: HeartIcon,
      description: 'Critères de recherche'
    },
    { 
      id: 'settings', 
      name: 'Paramètres', 
      icon: Cog6ToothIcon,
      description: 'Confidentialité et compte'
    }
  ]

  if (loading) {
    return (
      <div className="dashboard-container">
        <nav className="dashboard-navbar">
          <div className="dashboard-nav-content">
            <div className="dashboard-logo" onClick={() => router.push('/dashboard')}>
              <div className="dashboard-logo-icon">💖</div>
              <h1 className="dashboard-logo-text">Flow Dating</h1>
            </div>
          </div>
        </nav>
        
        <div className="dashboard-content">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-pulse-slow w-16 h-16 bg-gradient-to-r from-primary-400 to-secondary-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">💖</span>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400">Chargement de votre profil...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      {/* Navbar */}
      <nav className="dashboard-navbar">
        <div className="dashboard-nav-content">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-ghost flex items-center space-x-2"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span>Retour au dashboard</span>
            </button>
            
            <div className="dashboard-logo">
              <div className="dashboard-logo-icon">💖</div>
              <h1 className="dashboard-logo-text">Flow Dating</h1>
            </div>
          </div>
          
          <div className="dashboard-user-info">
            <div className="avatar avatar-online w-10 h-10">
              <div className="w-full h-full bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg">
                {profile?.name?.charAt(0) || session.user?.name?.charAt(0) || 'U'}
              </div>
            </div>
            <span className="dashboard-user-name">
              {profile?.name || session.user?.name || 'Utilisateur'}
            </span>
          </div>
        </div>
      </nav>

      <div className="dashboard-content">
        {/* Header */}
        <div className="dashboard-header">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="dashboard-title">
                Mon Profil
                <span className="dashboard-sparkle">👤</span>
              </h1>
              <p className="dashboard-subtitle">
                Gérez vos informations et préférences
              </p>
            </div>
          </div>
        </div>

        {/* Message d'alerte */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`dashboard-card p-4 mb-6 border-l-4 ${
                message.type === 'success'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-red-500 bg-red-50 dark:bg-red-900/20'
              }`}
            >
              <div className="flex items-center space-x-3">
                {message.type === 'success' ? (
                  <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                )}
                <span className={`font-medium ${
                  message.type === 'success'
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  {message.text}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation par onglets */}
        <div className="dashboard-card p-2 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {tabs.map((tab) => {
              const IconComponent = tab.icon
              const isActive = activeTab === tab.id
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`p-4 rounded-lg text-left transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/30 dark:to-secondary-900/30 border-2 border-primary-200 dark:border-primary-800'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-800 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <IconComponent className={`w-5 h-5 ${
                      isActive
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-neutral-500 dark:text-neutral-400'
                    }`} />
                    <span className={`font-medium text-sm ${
                      isActive
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-neutral-700 dark:text-neutral-300'
                    }`}>
                      {tab.name}
                    </span>
                  </div>
                  <p className={`text-xs ${
                    isActive
                      ? 'text-primary-500 dark:text-primary-400'
                      : 'text-neutral-500 dark:text-neutral-400'
                  }`}>
                    {tab.description}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Contenu des onglets */}
        <div className="dashboard-card">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'overview' && (
                <ProfileOverview
                  profile={profile}
                  photos={photos}
                  onTabChange={setActiveTab}
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
                  photos={photos}
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
                  photos={photos}
                  session={session}
                  onMessage={showMessage}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}