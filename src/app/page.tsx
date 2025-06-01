// app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'

export default function HomePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [animatedStats, setAnimatedStats] = useState({ users: 0, matches: 0, messages: 0 })

  // Animation des statistiques
  useEffect(() => {
    const animateNumber = (target: number, key: string, duration: number = 2000) => {
      const start = 0
      const startTime = Date.now()
      
      const updateNumber = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        // Animation avec ease-out
        const easeOut = 1 - Math.pow(1 - progress, 3)
        const current = Math.floor(start + (target - start) * easeOut)
        
        setAnimatedStats(prev => ({ ...prev, [key]: current }))
        
        if (progress < 1) {
          requestAnimationFrame(updateNumber)
        }
      }
      
      requestAnimationFrame(updateNumber)
    }

    // Démarrer les animations avec des délais différents
    setTimeout(() => animateNumber(50000, 'users'), 300)
    setTimeout(() => animateNumber(25000, 'matches'), 600)
    setTimeout(() => animateNumber(100000, 'messages'), 900)
  }, [])

  const handleGetStarted = () => {
    if (session) {
      router.push('/dashboard')  // ← Changé de /profile vers /dashboard
    } else {
      router.push('/auth/register')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100">
      {/* Navigation */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-600/10 to-purple-600/10"></div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 animate-pulse">
          <div className="w-8 h-8 text-pink-300 text-2xl">💖</div>
        </div>
        <div className="absolute top-40 right-20 animate-bounce">
          <div className="w-6 h-6 text-purple-300 text-xl">✨</div>
        </div>
        <div className="absolute bottom-20 left-1/4 animate-pulse">
          <div className="w-6 h-6 text-pink-400 text-xl">💕</div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 text-center lg:text-left">
              <div className="space-y-4">
                <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                  <span className="text-4xl">💕</span>
                  <br />
                  <span className="bg-gradient-to-r from-pink-600 via-rose-500 to-purple-600 bg-clip-text text-transparent">
                    Bienvenue sur
                  </span>
                  <br />
                  <span className="text-gray-800">
                    Flow Dating
                  </span>
                </h1>
                
                <p className="text-xl text-gray-600 leading-relaxed">
                  Trouvez l'amour de votre vie avec notre plateforme nouvelle génération. 
                  Des connexions authentiques vous attendent.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button 
                  onClick={handleGetStarted}
                  className="group bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                >
                  <span>
                    {session ? 'Accéder à mon tableau de bord' : 'S\'inscrire'}
                  </span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
                
                {!session && (
                  <button 
                    onClick={() => router.push('/auth/login')}
                    className="bg-white/80 backdrop-blur-sm text-gray-800 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white hover:shadow-lg transition-all duration-300 transform hover:scale-105 border border-pink-200"
                  >
                    Se connecter
                  </button>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-8 pt-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-pink-600">
                    {animatedStats.users.toLocaleString()}+
                  </div>
                  <div className="text-gray-600 text-sm">Utilisateurs actifs</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {animatedStats.matches.toLocaleString()}+
                  </div>
                  <div className="text-gray-600 text-sm">Matchs réalisés</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-rose-600">
                    {animatedStats.messages.toLocaleString()}+
                  </div>
                  <div className="text-gray-600 text-sm">Messages échangés</div>
                </div>
              </div>
            </div>

            {/* Hero Image/Illustration */}
            <div className="relative">
              <div className="bg-gradient-to-br from-pink-400 via-rose-400 to-purple-500 rounded-3xl p-8 transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="bg-white rounded-2xl p-8 space-y-6 transform -rotate-3">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-2xl">💖</span>
                    </div>
                    <div>
                      <div className="h-4 bg-pink-200 rounded w-32 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      <div className="h-3 bg-gray-200 rounded w-40"></div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-pink-400 rounded-full"></div>
                      <div className="h-3 bg-gray-200 rounded w-32"></div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                      <div className="h-3 bg-gray-200 rounded w-36"></div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <div className="bg-pink-500 text-white px-4 py-2 rounded-full text-sm">💕 Match!</div>
                    <div className="bg-purple-500 text-white px-4 py-2 rounded-full text-sm">✨ Super Like</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              Pourquoi choisir Flow Dating ?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Nous utilisons la technologie la plus avancée pour vous aider à trouver des connexions authentiques
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: "👥",
                title: "Algorithme intelligent",
                description: "Notre IA analyse vos préférences pour vous proposer les profils les plus compatibles",
                color: "pink"
              },
              {
                icon: "🔒",
                title: "Sécurité maximale",
                description: "Vérification des profils et protection de vos données personnelles garanties",
                color: "purple"
              },
              {
                icon: "💬",
                title: "Chat en temps réel",
                description: "Communiquez instantanément avec vos matchs grâce à notre système de messagerie",
                color: "rose"
              },
              {
                icon: "💖",
                title: "Matchs de qualité",
                description: "Focalisez-vous sur les personnes qui vous correspondent vraiment",
                color: "pink"
              },
              {
                icon: "⭐",
                title: "Profils vérifiés",
                description: "Tous les profils sont vérifiés pour garantir des rencontres authentiques",
                color: "purple"
              },
              {
                icon: "✨",
                title: "Expérience premium",
                description: "Interface intuitive et fonctionnalités avancées pour une expérience optimale",
                color: "rose"
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="group bg-gradient-to-br from-white to-gray-50 p-8 rounded-2xl border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className={`w-14 h-14 bg-gradient-to-r from-${feature.color}-400 to-${feature.color}-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <span className="text-white text-2xl">{feature.icon}</span>
                </div>
                
                <h3 className="text-xl font-semibold text-gray-800 mb-3">
                  {feature.title}
                </h3>
                
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Prêt à trouver l'amour ?
          </h2>
          
          <p className="text-xl text-pink-100 mb-8 max-w-2xl mx-auto">
            Rejoignez Flow Dating dès aujourd'hui et commencez votre histoire d'amour
          </p>

          <button 
            onClick={handleGetStarted}
            className="bg-white text-pink-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-pink-50 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            {session ? 'Accéder à mon tableau de bord' : 'Créer mon profil gratuitement'}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <span className="text-pink-500 text-xl">💖</span>
                <span className="text-lg font-bold">💕 Flow Dating</span>
              </div>
              <p className="text-gray-400">
                La plateforme de rencontre nouvelle génération pour des connexions authentiques.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Liens utiles</h4>
              <div className="space-y-2 text-gray-400">
                <div className="hover:text-white cursor-pointer transition-colors">À propos</div>
                <div className="hover:text-white cursor-pointer transition-colors">Comment ça marche</div>
                <div className="hover:text-white cursor-pointer transition-colors">Témoignages</div>
                <div className="hover:text-white cursor-pointer transition-colors">Blog</div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <div className="space-y-2 text-gray-400">
                <div className="hover:text-white cursor-pointer transition-colors">Centre d'aide</div>
                <div className="hover:text-white cursor-pointer transition-colors">Conditions d'utilisation</div>
                <div className="hover:text-white cursor-pointer transition-colors">Politique de confidentialité</div>
                <div className="hover:text-white cursor-pointer transition-colors">Contact</div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Suivez-nous</h4>
              <div className="space-y-2 text-gray-400">
                <div className="hover:text-white cursor-pointer transition-colors">📘 Facebook</div>
                <div className="hover:text-white cursor-pointer transition-colors">📷 Instagram</div>
                <div className="hover:text-white cursor-pointer transition-colors">🐦 Twitter</div>
                <div className="hover:text-white cursor-pointer transition-colors">🎵 TikTok</div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Flow Dating. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}