'use client'

import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useState } from 'react'

interface NavbarProps {
  userName: string
  userInitial: string
}

export default function Navbar({ userName, userInitial }: NavbarProps) {
  const router = useRouter()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await signOut({ 
        callbackUrl: '/auth/login',
        redirect: true 
      })
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error)
      setIsLoggingOut(false)
    }
  }

  return (
    <nav className="dashboard-navbar">
      <div className="dashboard-nav-content">
        {/* Logo */}
        <div className="dashboard-logo" onClick={() => router.push('/dashboard')}>
          <div className="dashboard-logo-icon">💖</div>
          <h1 className="dashboard-logo-text">Flow Dating</h1>
        </div>
        
        {/* Menu utilisateur */}
        <div className="relative">
          <div 
            className="dashboard-user-info cursor-pointer"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className="avatar avatar-online w-10 h-10">
              <div className="w-full h-full bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg">
                {userInitial}
              </div>
            </div>
            <span className="dashboard-user-name">{userName}</span>
            <svg 
              className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
              {/* Profil */}
              <button
                onClick={() => {
                  router.push('/profile')
                  setIsDropdownOpen(false)
                }}
                className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors"
              >
                <span className="text-lg">👤</span>
                <div>
                  <div className="font-medium text-gray-900">Mon Profil</div>
                  <div className="text-sm text-gray-500">Gérer mes informations</div>
                </div>
              </button>

              {/* Paramètres */}
              <button
                onClick={() => {
                  router.push('/settings')
                  setIsDropdownOpen(false)
                }}
                className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors"
              >
                <span className="text-lg">⚙️</span>
                <div>
                  <div className="font-medium text-gray-900">Paramètres</div>
                  <div className="text-sm text-gray-500">Préférences et confidentialité</div>
                </div>
              </button>

              {/* Premium */}
              <button
                onClick={() => {
                  router.push('/premium')
                  setIsDropdownOpen(false)
                }}
                className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors"
              >
                <span className="text-lg">👑</span>
                <div>
                  <div className="font-medium text-gray-900 flex items-center gap-2">
                    Premium
                    <span className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full">
                      ✨
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">Débloquer toutes les fonctionnalités</div>
                </div>
              </button>

              {/* Divider */}
              <div className="my-2 border-t border-gray-100"></div>

              {/* Aide */}
              <button
                onClick={() => {
                  router.push('/help')
                  setIsDropdownOpen(false)
                }}
                className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors"
              >
                <span className="text-lg">❓</span>
                <div>
                  <div className="font-medium text-gray-900">Aide</div>
                  <div className="text-sm text-gray-500">Support et FAQ</div>
                </div>
              </button>

              {/* Divider */}
              <div className="my-2 border-t border-gray-100"></div>

              {/* Déconnexion */}
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-red-50 transition-colors text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-lg">
                  {isLoggingOut ? '⏳' : '🚪'}
                </span>
                <div>
                  <div className="font-medium">
                    {isLoggingOut ? 'Déconnexion...' : 'Se déconnecter'}
                  </div>
                  <div className="text-sm text-red-500">
                    {isLoggingOut ? 'Patientez...' : 'Quitter Flow Dating'}
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Overlay pour fermer le dropdown */}
      {isDropdownOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </nav>
  )
}