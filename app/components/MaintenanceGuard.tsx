'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AlertTriangle, Wrench, Clock } from 'lucide-react'

interface MaintenanceStatus {
  maintenance: boolean
  message: string | null
  announcement: string | null
  announcementType: string | null
  isAdmin?: boolean
}

// Routes qui doivent rester accessibles même en maintenance
const ALLOWED_ROUTES = [
  '/admin',
  '/api',
  '/auth',
  '/_next',
  '/favicon',
]

export function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<MaintenanceStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const res = await fetch('/api/maintenance/status')
        if (res.ok) {
          const data = await res.json()
          setStatus(data)
        }
      } catch (error) {
        console.error('Error checking maintenance status:', error)
      } finally {
        setLoading(false)
      }
    }

    checkMaintenance()

    // Vérifier toutes les 60 secondes
    const interval = setInterval(checkMaintenance, 60000)
    return () => clearInterval(interval)
  }, [])

  // Vérifier si la route actuelle est autorisée
  const isAllowedRoute = ALLOWED_ROUTES.some(route => pathname.startsWith(route))

  // Afficher la page de maintenance si nécessaire
  if (!loading && status?.maintenance && !isAllowedRoute) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center">
          {/* Icon */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-yellow-500/20 mb-4">
              <Wrench className="w-12 h-12 text-yellow-500 animate-pulse" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold text-white mb-4">
            Maintenance en cours
          </h1>

          {/* Message */}
          <p className="text-xl text-gray-300 mb-8">
            {status.message || "L'application est temporairement indisponible pour maintenance. Veuillez réessayer plus tard."}
          </p>

          {/* Info box */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8">
            <div className="flex items-center justify-center gap-3 text-yellow-400 mb-4">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-semibold">Nous revenons bientot</span>
            </div>
            <p className="text-gray-400 text-sm">
              Notre equipe travaille pour ameliorer votre experience.
              Merci de votre patience et de votre comprehension.
            </p>
          </div>

          {/* Status indicator */}
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Verification automatique en cours...</span>
          </div>

          {/* Logo */}
          <div className="mt-12">
            <span className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              FlowDating
            </span>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Composant pour afficher l'annonce globale
export function GlobalAnnouncement() {
  const [status, setStatus] = useState<MaintenanceStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/maintenance/status')
        if (res.ok) {
          const data = await res.json()
          setStatus(data)
        }
      } catch (error) {
        console.error('Error checking status:', error)
      }
    }

    checkStatus()
  }, [])

  if (!status?.announcement || dismissed) {
    return null
  }

  const typeStyles = {
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    success: 'bg-green-500/10 border-green-500/30 text-green-400',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    error: 'bg-red-500/10 border-red-500/30 text-red-400',
  }

  const style = typeStyles[status.announcementType as keyof typeof typeStyles] || typeStyles.info

  return (
    <div className={`border-b px-4 py-3 ${style}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <p className="text-sm font-medium">{status.announcement}</p>
        <button
          onClick={() => setDismissed(true)}
          className="ml-4 text-current hover:opacity-70 transition-opacity"
        >
          &times;
        </button>
      </div>
    </div>
  )
}
