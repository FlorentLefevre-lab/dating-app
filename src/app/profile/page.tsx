import { EmailProtection } from '@/components/auth/EmailProtection'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/auth/LogoutButton'

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  
  // Rediriger vers login si pas connecté (protection côté serveur)
  if (!session) {
    redirect('/auth/login')
  }

  return (
    <EmailProtection loadingMessage="Vérification de votre email...">
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <img
                  src={session.user?.image || '/default-avatar.jpg'}
                  alt="Profile"
                  className="w-16 h-16 rounded-full border-2 border-pink-500"
                />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Bienvenue, {session.user?.name} !
                  </h1>
                  <p className="text-gray-600">{session.user?.email}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-sm text-green-600 flex items-center">
                      ✅ Email vérifié
                    </span>
                    <span className="text-sm text-blue-600">
                      🛡️ Accès protégé
                    </span>
                  </div>
                </div>
              </div>
              
              <LogoutButton />
            </div>
          </div>

          {/* Contenu du profil */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Votre profil sécurisé</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nom complet
                </label>
                <p className="mt-1 text-sm text-gray-900">{session.user?.name || 'Non renseigné'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <p className="mt-1 text-sm text-gray-900">{session.user?.email}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Statut de vérification
                </label>
                <p className="mt-1 text-sm text-green-600 font-medium">
                  ✅ Email vérifié - Accès complet autorisé
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex">
                  <div className="text-green-400 text-xl mr-3">🎉</div>
                  <div>
                    <h3 className="text-sm font-medium text-green-800">
                      Félicitations !
                    </h3>
                    <p className="text-sm text-green-700 mt-1">
                      Votre email est vérifié. Vous avez accès à toutes les fonctionnalités de LoveApp.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Prochaines étapes */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              🚀 Prochaines étapes
            </h3>
            <ul className="text-blue-800 space-y-1">
              <li>• Compléter votre profil (âge, bio, photos)</li>
              <li>• Définir vos préférences de rencontre</li>
              <li>• Commencer à découvrir des profils</li>
            </ul>
          </div>
        </div>
      </div>
    </EmailProtection>
  )
}