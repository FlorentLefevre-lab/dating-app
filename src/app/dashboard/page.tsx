// app/dashboard/page.tsx
'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Navbar from '@/components/layout/Navbar'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [timeOfDay, setTimeOfDay] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/login')
      return
    }

    // Déterminer le moment de la journée
    const hour = new Date().getHours()
    if (hour < 12) setTimeOfDay('Bonjour')
    else if (hour < 18) setTimeOfDay('Bon après-midi')
    else setTimeOfDay('Bonsoir')
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirection...</p>
        </div>
      </div>
    )
  }

  const menuOptions = [
    {
      title: "Découvrir",
      description: "Explorez de nouveaux profils",
      icon: "🔍",
      route: "/discover",
      color: "from-pink-400 to-rose-500",
      stats: "50+ nouveaux profils"
    },
    {
      title: "Mes Matches",
      description: "Vos connexions réciproques",
      icon: "💖",
      route: "/matches",
      color: "from-purple-400 to-pink-500",
      stats: "3 nouveaux matches"
    },
    {
      title: "Messages",
      description: "Discutez avec vos matches",
      icon: "💬",
      route: "/chat",
      color: "from-rose-400 to-pink-500",
      stats: "2 messages non lus"
    },
    {
      title: "Mon Profil",
      description: "Gérez votre profil",
      icon: "👤",
      route: "/profile",
      color: "from-indigo-400 to-purple-500",
      stats: "85% complété"
    },
    {
      title: "Recherche",
      description: "Filtres et préférences",
      icon: "⚙️",
      route: "/search",
      color: "from-teal-400 to-blue-500",
      stats: "Critères actifs"
    },
    {
      title: "Événements",
      description: "Rencontres dans votre région",
      icon: "🎉",
      route: "/events",
      color: "from-orange-400 to-red-500",
      stats: "5 événements proches"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header avec salutation */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                {timeOfDay}, {session.user?.name} ! 👋
              </h1>
              <p className="text-gray-600 mt-2">
                Prêt pour de nouvelles rencontres ? Explorez vos options ci-dessous.
              </p>
            </div>
            
            {/* Quick stats */}
            <div className="hidden md:flex space-x-6 bg-white rounded-2xl p-6 shadow-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-pink-600">127</div>
                <div className="text-sm text-gray-500">Vues de profil</div>
              </div>
              <div className="text-center border-l border-gray-200 pl-6">
                <div className="text-2xl font-bold text-purple-600">23</div>
                <div className="text-sm text-gray-500">Likes reçus</div>
              </div>
              <div className="text-center border-l border-gray-200 pl-6">
                <div className="text-2xl font-bold text-rose-600">8</div>
                <div className="text-sm text-gray-500">Matches</div>
              </div>
            </div>
          </div>
        </div>

        {/* Menu principal en grille */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {menuOptions.map((option, index) => (
            <div
              key={index}
              onClick={() => router.push(option.route)}
              className="group cursor-pointer bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-16 h-16 bg-gradient-to-r ${option.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <span className="text-white text-2xl">{option.icon}</span>
                </div>
                
                {/* Badge de notification */}
                <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  Nouveau
                </div>
              </div>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-2 group-hover:text-pink-600 transition-colors">
                {option.title}
              </h3>
              
              <p className="text-gray-600 mb-3">
                {option.description}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {option.stats}
                </span>
                <span className="text-pink-500 group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Section activité récente */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Activité récente</h2>
          
          <div className="space-y-4">
            {[
              {
                type: "match",
                message: "Nouveau match avec Sarah !",
                time: "Il y a 2 heures",
                icon: "💖",
                color: "bg-pink-100 text-pink-600"
              },
              {
                type: "like",
                message: "Vous avez reçu 3 nouveaux likes",
                time: "Il y a 4 heures",
                icon: "👍",
                color: "bg-purple-100 text-purple-600"
              },
              {
                type: "message",
                message: "Emma vous a envoyé un message",
                time: "Hier",
                icon: "💬",
                color: "bg-blue-100 text-blue-600"
              },
              {
                type: "view",
                message: "Votre profil a été vu 15 fois",
                time: "Hier",
                icon: "👁️",
                color: "bg-green-100 text-green-600"
              }
            ].map((activity, index) => (
              <div key={index} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activity.color}`}>
                  <span>{activity.icon}</span>
                </div>
                
                <div className="flex-1">
                  <p className="text-gray-800 font-medium">{activity.message}</p>
                  <p className="text-gray-500 text-sm">{activity.time}</p>
                </div>
                
                <span className="text-gray-400 hover:text-pink-500 cursor-pointer">
                  →
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Section conseils du jour */}
        <div className="mt-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl p-6 text-white">
          <h3 className="text-xl font-bold mb-2">💡 Conseil du jour</h3>
          <p className="text-pink-100">
            "Ajoutez une photo de vous en train de faire une activité que vous aimez. 
            Cela augmente vos chances de match de 40% !"
          </p>
          <button 
            onClick={() => router.push('/profile')}
            className="mt-4 bg-white text-pink-600 px-4 py-2 rounded-lg hover:bg-pink-50 transition-colors"
          >
            Mettre à jour mon profil
          </button>
        </div>
      </div>
    </div>
  )
}