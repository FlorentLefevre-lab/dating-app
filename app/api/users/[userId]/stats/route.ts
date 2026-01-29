// src/app/api/users/[userId]/stats/route.ts - Version avec cache Redis
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiCache } from '@/lib/cache'

// TTL du cache en secondes (5 minutes)
const STATS_CACHE_TTL = 300

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // ⚡ AWAIT des params pour Next.js 15
    const { userId } = await params
    const session = await auth()

    // Vérification de l'authentification
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Vérification que l'utilisateur demande ses propres stats
    if (session.user.id !== userId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // 🔥 CHECK CACHE FIRST
    const cachedStats = await apiCache.stats.get(userId)
    if (cachedStats) {
      console.log(`📦 [Stats API] Cache HIT for ${userId}`)
      return NextResponse.json({
        ...cachedStats as object,
        meta: {
          ...(cachedStats as { meta?: object }).meta,
          cacheHit: true
        }
      }, {
        headers: {
          'Cache-Control': 'private, max-age=60',
          'X-Cache': 'HIT'
        }
      })
    }
    console.log(`📦 [Stats API] Cache MISS for ${userId}`)

    // 📅 Calcul des dates pour les stats du jour
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    console.log(`🔄 Calcul des statistiques (sans messages) pour l'utilisateur: ${userId}`)

    // 📊 REQUÊTES PARALLÈLES - Version avec matchStats
    const [
      // 🔢 TOTAUX (depuis la création du profil)
      totalProfileViews,
      totalLikesReceived,

      // 📅 STATS DU JOUR
      dailyProfileViews,
      dailyLikesReceived,

      // 🔥 MATCHES - via table Match
      totalMatchesFromTable,
      dailyMatchesFromTable,
      thisWeekMatchesFromTable,
      matchesWithActivity
    ] = await Promise.all([
      // ✅ Vues de profil (TOTAL)
      prisma.profileView.count({
        where: { viewedId: userId }
      }),

      // ✅ Likes reçus (TOTAL)
      prisma.like.count({
        where: { receiverId: userId }
      }),

      // ✅ Vues de profil (AUJOURD'HUI)
      prisma.profileView.count({
        where: {
          viewedId: userId,
          createdAt: { gte: startOfDay }
        }
      }),

      // ✅ Likes reçus (AUJOURD'HUI)
      prisma.like.count({
        where: {
          receiverId: userId,
          createdAt: { gte: startOfDay }
        }
      }),

      // ✅ Matches actifs (TOTAL) - depuis table Match
      prisma.match.count({
        where: {
          status: 'ACTIVE',
          OR: [
            { user1Id: userId },
            { user2Id: userId }
          ]
        }
      }),

      // ✅ Matches du jour (AUJOURD'HUI)
      prisma.match.count({
        where: {
          status: 'ACTIVE',
          createdAt: { gte: startOfDay },
          OR: [
            { user1Id: userId },
            { user2Id: userId }
          ]
        }
      }),

      // ✅ Matches cette semaine
      prisma.match.count({
        where: {
          status: 'ACTIVE',
          createdAt: { gte: oneWeekAgo },
          OR: [
            { user1Id: userId },
            { user2Id: userId }
          ]
        }
      }),

      // ✅ Matches avec détails d'activité
      prisma.match.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { user1Id: userId },
            { user2Id: userId }
          ]
        },
        select: {
          id: true,
          user1Id: true,
          user2Id: true,
          user1: { select: { isOnline: true, lastSeen: true } },
          user2: { select: { isOnline: true, lastSeen: true } }
        }
      })
    ])

    // 📊 Calculer les conversations actives vs dormantes
    let activeConversations = 0
    let dormantMatches = 0
    let totalResponseHours = 0
    let activeUsersCount = 0

    for (const match of matchesWithActivity) {
      const otherUser = match.user1Id === userId ? match.user2 : match.user1
      const isActive = otherUser.isOnline ||
        (otherUser.lastSeen && new Date(otherUser.lastSeen) > oneWeekAgo)

      if (isActive) {
        activeConversations++
        activeUsersCount++
        if (otherUser.isOnline) {
          totalResponseHours += 1
        } else if (otherUser.lastSeen) {
          const hoursSinceLastSeen = (now.getTime() - new Date(otherUser.lastSeen).getTime()) / (1000 * 60 * 60)
          totalResponseHours += Math.min(hoursSinceLastSeen, 24)
        }
      } else {
        dormantMatches++
      }
    }

    // Temps de réponse moyen
    const averageHours = activeUsersCount > 0 ? totalResponseHours / activeUsersCount : 0
    let averageResponseTime = '0h'
    if (averageHours < 1) {
      averageResponseTime = '< 1h'
    } else if (averageHours < 24) {
      averageResponseTime = `${Math.round(averageHours)}h`
    } else {
      averageResponseTime = `${Math.round(averageHours / 24)}j`
    }

    // 📊 STRUCTURE FLEXIBLE - Avec matchStats
    const stats = {
      // 🔄 RÉTRO-COMPATIBILITÉ : Propriétés de niveau racine
      messagesReceived: 0,
      matchesCount: totalMatchesFromTable,
      profileViews: totalProfileViews,
      likesReceived: totalLikesReceived,

      // 📅 Stats du jour
      dailyStats: {
        messagesReceived: 0,
        profileViews: dailyProfileViews,
        likesReceived: dailyLikesReceived,
        matchesCount: dailyMatchesFromTable
      },

      // 🔢 Stats totales
      totalStats: {
        messagesReceived: 0,
        profileViews: totalProfileViews,
        likesReceived: totalLikesReceived,
        matchesCount: totalMatchesFromTable
      },

      // 🔥 Stats de matches détaillées (NOUVEAU)
      matchStats: {
        totalMatches: totalMatchesFromTable,
        newMatches: dailyMatchesFromTable,
        activeConversations: activeConversations,
        dormantMatches: dormantMatches,
        averageResponseTime: averageResponseTime,
        thisWeekMatches: thisWeekMatchesFromTable
      },

      // 📈 Métadonnées
      meta: {
        userId: userId,
        timestamp: new Date().toISOString(),
        startOfDay: startOfDay.toISOString(),
        dataSource: 'database'
      }
    }

    // 🔥 CACHE THE STATS
    await apiCache.stats.set(userId, stats)
    console.log(`💾 [Stats API] Cached stats for ${userId} (TTL: 5min)`)

    // 📝 LOG DÉTAILLÉ
    console.log(`📊 Stats calculées pour ${userId}:`, {
      '📅 Stats du jour': stats.dailyStats,
      '🔢 Stats totales': stats.totalStats,
      '🔥 Match stats': stats.matchStats
    })

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'private, max-age=60',
        'X-Cache': 'MISS'
      }
    })
    
  } catch (error) {
    console.error('❌ Erreur lors du calcul des statistiques:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors du calcul des statistiques' },
      { status: 500 }
    )
  }
}