// src/app/api/user/stats/route.ts
// Optimisé avec cache Redis et requêtes SQL optimisées
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { cache } from '@/lib/cache';

// Configuration du cache
const STATS_CACHE_TTL = 300; // 5 minutes
const STATS_CACHE_PREFIX = 'stats:';

interface DailyStats {
  profileViews: number;
  likesReceived: number;
  matchesCount: number;
}

interface TotalStats {
  profileViews: number;
  likesReceived: number;
  matchesCount: number;
}

interface MatchStats {
  totalMatches: number;
  newMatches: number;
  activeConversations: number;
  dormantMatches: number;
  averageResponseTime: string;
  thisWeekMatches: number;
}

interface StatsMeta {
  timestamp: string;
  userId: string;
  memberSince: string;
  lastSeen?: string;
  dataSource: string;
  isOnline?: boolean;
  cacheHit?: boolean;
  processingTimeMs?: number;
}

interface UserStatsResponse {
  profileViews: number;
  likesReceived: number;
  matchesCount: number;
  dailyStats: DailyStats;
  totalStats: TotalStats;
  matchStats: MatchStats;
  meta: StatsMeta;
}

/**
 * Calcule les statistiques optimisées avec requêtes SQL efficaces
 */
async function calculateStats(userId: string): Promise<UserStatsResponse> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startTime = Date.now();

  // Requêtes optimisées en parallèle avec COUNT au lieu de findMany
  const [
    user,
    totalLikesReceived,
    dailyLikesReceived,
    matchesCount,
    dailyMatchesCount,
    profileViewsCount,
    dailyProfileViewsCount,
    thisWeekMatchesCount,
    matchesWithActivity
  ] = await Promise.all([
    // User info
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        createdAt: true,
        lastSeen: true,
        isOnline: true
      }
    }),

    // Total likes reçus (COUNT)
    prisma.like.count({
      where: { receiverId: userId }
    }),

    // Likes reçus aujourd'hui (COUNT)
    prisma.like.count({
      where: {
        receiverId: userId,
        createdAt: { gte: startOfDay }
      }
    }),

    // Nombre de matches actifs (COUNT avec JOIN optimisé)
    prisma.match.count({
      where: {
        status: 'ACTIVE',
        OR: [
          { user1Id: userId },
          { user2Id: userId }
        ]
      }
    }),

    // Matches d'aujourd'hui (COUNT)
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

    // Vraies vues de profil (COUNT depuis ProfileView)
    prisma.profileView.count({
      where: { viewedId: userId }
    }),

    // Vues de profil aujourd'hui (COUNT)
    prisma.profileView.count({
      where: {
        viewedId: userId,
        createdAt: { gte: startOfDay }
      }
    }),

    // Matches cette semaine (COUNT)
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

    // Matches avec détails pour calculer l'activité
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
        createdAt: true,
        user1: {
          select: { isOnline: true, lastSeen: true }
        },
        user2: {
          select: { isOnline: true, lastSeen: true }
        },
        user1Id: true,
        user2Id: true
      }
    })
  ]);

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  // Calculer les conversations actives vs dormantes
  let activeConversations = 0;
  let dormantMatches = 0;
  let totalResponseHours = 0;
  let activeUsersCount = 0;

  for (const match of matchesWithActivity) {
    const otherUser = match.user1Id === userId ? match.user2 : match.user1;
    const isActive = otherUser.isOnline ||
      (otherUser.lastSeen && new Date(otherUser.lastSeen) > oneWeekAgo);

    if (isActive) {
      activeConversations++;
      activeUsersCount++;

      if (otherUser.isOnline) {
        totalResponseHours += 1;
      } else if (otherUser.lastSeen) {
        const hoursSinceLastSeen = (now.getTime() - new Date(otherUser.lastSeen).getTime()) / (1000 * 60 * 60);
        totalResponseHours += Math.min(hoursSinceLastSeen, 24);
      }
    } else {
      dormantMatches++;
    }
  }

  // Calculer le temps de réponse moyen
  const averageHours = activeUsersCount > 0 ? totalResponseHours / activeUsersCount : 0;
  let averageResponseTime = '0h';
  if (averageHours < 1) {
    averageResponseTime = '< 1h';
  } else if (averageHours < 24) {
    averageResponseTime = `${Math.round(averageHours)}h`;
  } else {
    averageResponseTime = `${Math.round(averageHours / 24)}j`;
  }

  const processingTime = Date.now() - startTime;

  // Construction de la réponse avec vraies données
  const statsData: UserStatsResponse = {
    profileViews: profileViewsCount,
    likesReceived: totalLikesReceived,
    matchesCount: matchesCount,

    dailyStats: {
      profileViews: dailyProfileViewsCount,
      likesReceived: dailyLikesReceived,
      matchesCount: dailyMatchesCount
    },

    totalStats: {
      profileViews: profileViewsCount,
      likesReceived: totalLikesReceived,
      matchesCount: matchesCount
    },

    matchStats: {
      totalMatches: matchesCount,
      newMatches: dailyMatchesCount,
      activeConversations: activeConversations,
      dormantMatches: dormantMatches,
      averageResponseTime: averageResponseTime,
      thisWeekMatches: thisWeekMatchesCount
    },

    meta: {
      timestamp: now.toISOString(),
      userId: userId,
      memberSince: user.createdAt.toISOString(),
      lastSeen: user.lastSeen?.toISOString(),
      isOnline: user.isOnline,
      dataSource: 'database',
      cacheHit: false,
      processingTimeMs: processingTime
    }
  };

  return statsData;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Vérification de l'authentification
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          message: 'Vous devez être connecté pour accéder aux statistiques'
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const cacheKey = `${STATS_CACHE_PREFIX}${userId}`;

    // 2. Vérifier le cache d'abord
    const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true';

    if (!forceRefresh) {
      const cachedStats = await cache.get<UserStatsResponse>(cacheKey);

      if (cachedStats) {
        const processingTime = Date.now() - startTime;

        // Mettre à jour les métadonnées pour indiquer cache hit
        const response = NextResponse.json({
          ...cachedStats,
          meta: {
            ...cachedStats.meta,
            cacheHit: true,
            timestamp: new Date().toISOString()
          }
        });

        response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');
        response.headers.set('X-Processing-Time', `${processingTime}ms`);
        response.headers.set('X-Cache', 'HIT');

        console.log(`✅ Stats cache HIT for user ${userId} (${processingTime}ms)`);
        return response;
      }
    }

    // 3. Calculer les stats (cache miss ou refresh forcé)
    const statsData = await calculateStats(userId);

    // 4. Mettre en cache pour les prochaines requêtes
    await cache.set(cacheKey, statsData, { ttl: STATS_CACHE_TTL });

    const processingTime = Date.now() - startTime;
    console.log(`📊 Stats calculated for user ${userId} (${processingTime}ms) - cached for ${STATS_CACHE_TTL}s`);

    const response = NextResponse.json(statsData);
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');
    response.headers.set('X-Processing-Time', `${processingTime}ms`);
    response.headers.set('X-Cache', 'MISS');

    return response;

  } catch (error: any) {
    const processingTime = Date.now() - startTime;

    if (error.message === 'USER_NOT_FOUND') {
      return NextResponse.json(
        {
          error: 'User not found',
          message: 'Utilisateur introuvable dans la base de données'
        },
        { status: 404 }
      );
    }

    console.error('❌ Erreur API Stats:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Erreur serveur lors du calcul des statistiques',
        timestamp: new Date().toISOString(),
        processingTime: `${processingTime}ms`,
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message
        })
      },
      { status: 500 }
    );
  }
}

// Endpoint pour invalider le cache manuellement
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const cacheKey = `${STATS_CACHE_PREFIX}${userId}`;

    await cache.delete(cacheKey);

    console.log(`🗑️ Stats cache invalidated for user ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Cache invalidé avec succès'
    });

  } catch (error: any) {
    console.error('❌ Erreur invalidation cache stats:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'invalidation du cache' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
