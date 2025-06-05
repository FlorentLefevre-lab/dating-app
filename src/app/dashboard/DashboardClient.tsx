// src/app/dashboard/DashboardClient.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../components/layout/Navbar'

interface DashboardClientProps {
  session: any
  userName: string
}

export default function DashboardClient({ session, userName }: DashboardClientProps) {
  const router = useRouter()
  const [animatedStats, setAnimatedStats] = useState({
    likes: 0,
    matches: 0,
    messages: 0,
    visits: 0
  })

  const userInitial = userName.charAt(0).toUpperCase()

  // Animation des statistiques au chargement
  useEffect(() => {
    const animateNumber = (target: number, key: string, duration: number = 2000) => {
      const start = 0
      const startTime = Date.now()
      
      const updateNumber = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        const easeOut = 1 - Math.pow(1 - progress, 3)
        const current = Math.floor(start + (target - start) * easeOut)
        
        setAnimatedStats(prev => ({ ...prev, [key]: current }))
        
        if (progress < 1) {
          requestAnimationFrame(updateNumber)
        }
      }
      
      requestAnimationFrame(updateNumber)
    }

    setTimeout(() => animateNumber(23, 'likes'), 300)
    setTimeout(() => animateNumber(8, 'matches'), 600)
    setTimeout(() => animateNumber(15, 'messages'), 900)
    setTimeout(() => animateNumber(47, 'visits'), 1200)
  }, [])

  return (
    <div className="dashboard-container">
      {/* Navbar avec dropdown */}
      <Navbar userName={userName} userInitial={userInitial} />
      
      <div className="dashboard-content">
        {/* Header */}
        <div className="dashboard-header">
          <h1 className="dashboard-title">
            Tableau de bord
            <span className="dashboard-sparkle">✨</span>
          </h1>
          <p className="dashboard-subtitle">
            Bienvenue, <span className="dashboard-highlight">{userName}</span> !
            <span className="dashboard-heart">💕</span>
          </p>
        </div>

        {/* Stats */}
        <div className="dashboard-stats-grid">
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon likes">💖</div>
            <div className="dashboard-stat-number likes">{animatedStats.likes}</div>
            <div className="dashboard-stat-label">Likes reçus</div>
            <div className="dashboard-stat-trend">📈 +12% cette semaine</div>
          </div>

          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon matches">👥</div>
            <div className="dashboard-stat-number matches">{animatedStats.matches}</div>
            <div className="dashboard-stat-label">Matches</div>
            <div className="dashboard-stat-trend">⚡ +3 nouveaux</div>
          </div>

          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon messages">💬</div>
            <div className="dashboard-stat-number messages">{animatedStats.messages}</div>
            <div className="dashboard-stat-label">Messages</div>
            <div className="dashboard-stat-trend">📧 5 non lus</div>
          </div>

          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon visits">👁️</div>
            <div className="dashboard-stat-number visits">{animatedStats.visits}</div>
            <div className="dashboard-stat-label">Vues profil</div>
            <div className="dashboard-stat-trend">🚀 +18% aujourd'hui</div>
          </div>
        </div>

        {/* Actions principales */}
        <div className="dashboard-actions-grid">
          <Link href="/profile" className="dashboard-action-card">
            <div className="dashboard-action-header">
              <div className="dashboard-action-icon profile">👤</div>
              <div>
                <h3 className="dashboard-action-title">Profil</h3>
                <p className="dashboard-action-subtitle">Gérez vos informations</p>
              </div>
            </div>
            
            <div className="dashboard-progress-section">
              <div className="dashboard-progress-label">
                <span>Profil complet</span>
                <span className="dashboard-progress-percent">85%</span>
              </div>
              <div className="dashboard-progress-bar">
                <div className="dashboard-progress-fill"></div>
              </div>
            </div>
            
            <div className="dashboard-action-link">
              Compléter le profil →
            </div>
          </Link>

          <Link href="/discover" className="dashboard-action-card">
            <div className="dashboard-action-header">
              <div className="dashboard-action-icon discover">💖</div>
              <div>
                <h3 className="dashboard-action-title">Découvrir</h3>
                <p className="dashboard-action-subtitle">Trouvez de nouvelles personnes</p>
              </div>
            </div>
            
            <div className="dashboard-badge">
              ✨ 12 nouveaux profils
            </div>
            
            <div className="dashboard-action-link">
              Commencer à swiper →
            </div>
          </Link>

          <Link href="/matches" className="dashboard-action-card">
            <div className="dashboard-action-header">
              <div className="dashboard-action-icon matches">👫</div>
              <div>
                <h3 className="dashboard-action-title">Matches</h3>
                <p className="dashboard-action-subtitle">Vos connexions</p>
              </div>
            </div>
            
            <div className="dashboard-avatar-group">
              <div className="dashboard-small-avatar">A</div>
              <div className="dashboard-small-avatar">M</div>
              <div className="dashboard-small-avatar">L</div>
              <span className="dashboard-avatar-count">+5 autres</span>
            </div>
            
            <div className="dashboard-action-link warm">
              Voir tous les matches →
            </div>
          </Link>
        </div>

        {/* Activité récente */}
        <div className="dashboard-activity-section">
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <h2 className="dashboard-card-title">🎯 Activité récente</h2>
              <span className="dashboard-live-badge">🔴 En direct</span>
            </div>
            
            <div className="dashboard-activity-list">
              <div className="dashboard-activity-item">
                <div className="dashboard-activity-avatar alice">A</div>
                <div className="dashboard-activity-content">
                  <p className="dashboard-activity-text">
                    <strong className="dashboard-activity-user">Alice</strong> a liké votre profil
                  </p>
                  <p className="dashboard-activity-time">Il y a 2 heures</p>
                </div>
                <span className="dashboard-activity-icon">💖</span>
              </div>

              <div className="dashboard-activity-item">
                <div className="dashboard-activity-avatar marie">M</div>
                <div className="dashboard-activity-content">
                  <p className="dashboard-activity-text">
                    <strong className="dashboard-activity-user">Marie</strong> Nouveau match
                  </p>
                  <p className="dashboard-activity-time">Il y a 4 heures</p>
                </div>
                <span className="dashboard-activity-icon">✨</span>
              </div>

              <div className="dashboard-activity-item">
                <div className="dashboard-activity-avatar laura">L</div>
                <div className="dashboard-activity-content">
                  <p className="dashboard-activity-text">
                    <strong className="dashboard-activity-user">Laura</strong> vous a envoyé un message
                  </p>
                  <p className="dashboard-activity-time">Il y a 6 heures</p>
                </div>
                <span className="dashboard-activity-icon">💬</span>
              </div>
            </div>
          </div>

          {/* Conseils */}
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <h2 className="dashboard-card-title">💡 Conseils du jour</h2>
              <span className="dashboard-new-badge">Nouveau</span>
            </div>
            
            <div className="dashboard-tips-list">
              <div className="dashboard-tip">
                <span className="dashboard-tip-icon">📸</span>
                <div className="dashboard-tip-content">
                  <h4 className="dashboard-tip-title">Ajoutez plus de photos</h4>
                  <p className="dashboard-tip-text">Les profils avec 4+ photos reçoivent 3x plus de matches</p>
                </div>
              </div>

              <div className="dashboard-tip">
                <span className="dashboard-tip-icon">✍️</span>
                <div className="dashboard-tip-content">
                  <h4 className="dashboard-tip-title">Optimisez votre bio</h4>
                  <p className="dashboard-tip-text">Parlez de vos passions et ce qui vous rend unique</p>
                </div>
              </div>

              <div className="dashboard-tip">
                <span className="dashboard-tip-icon">⏰</span>
                <div className="dashboard-tip-content">
                  <h4 className="dashboard-tip-title">Moment optimal</h4>
                  <p className="dashboard-tip-text">Les dimanche soirs sont parfaits pour swiper</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Premium */}
        <div className="dashboard-premium-cta">
          <div className="dashboard-premium-decorations">⭐</div>
          <div className="dashboard-premium-decorations">✨</div>
          <div className="dashboard-premium-decorations">🎁</div>
          
          <div className="dashboard-premium-icon">👑</div>
          
          <h3 className="dashboard-premium-title">Passez à Flow Dating Premium</h3>
          
          <p className="dashboard-premium-text">
            Débloquez toutes les fonctionnalités premium et multipliez vos chances de rencontre par 3
          </p>
          
          <div className="dashboard-premium-features">
            <div className="dashboard-premium-feature likes">
              ⭐ <span>Likes illimités</span>
            </div>
            <div className="dashboard-premium-feature super">
              ⚡ <span>Super Likes</span>
            </div>
            <div className="dashboard-premium-feature see">
              👁️ <span>Voir qui vous like</span>
            </div>
          </div>
          
          <button className="dashboard-premium-button">
            Découvrir Premium ✨
          </button>
        </div>
      </div>
    </div>
  )
}