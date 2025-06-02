// src/app/api/chat/stats/route.ts - API pour les statistiques du chat
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('📊 API Statistiques du chat');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { prisma } = await import('@/lib/db');

    // Paralléliser les requêtes pour de meilleures performances
    const [
      totalUsers,
      totalMessages,
      totalLikes,
      totalDislikes,
      recentMessages,
      activeUsers,
      topProfessions,
      topLocations,
      messagesByDay
    ] = await Promise.all([
      // Nombre total d'utilisateurs
      prisma.user.count({
        where: {
          email: { not: { endsWith: '@system.local' } }
        }
      }),

      // Nombre total de messages
      prisma.message.count(),

      // Nombre total de likes
      prisma.like.count(),

      // Nombre total de dislikes
      prisma.dislike.count(),

      // Messages récents (dernières 24h)
      prisma.message.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),

      // Utilisateurs actifs (qui ont envoyé un message dans les 7 derniers jours)
      prisma.user.count({
        where: {
          sentMessages: {
            some: {
              createdAt: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              }
            }
          }
        }
      }),

      // Top professions
      prisma.user.groupBy({
        by: ['profession'],
        where: {
          profession: { not: null },
          email: { not: { endsWith: '@system.local' } }
        },
        _count: { profession: true },
        orderBy: { _count: { profession: 'desc' } },
        take: 5
      }),

      // Top localisations
      prisma.user.groupBy({
        by: ['location'],
        where: {
          location: { not: null },
          email: { not: { endsWith: '@system.local' } }
        },
        _count: { location: true },
        orderBy: { _count: { location: 'desc' } },
        take: 5
      }),

      // Messages par jour (7 derniers jours)
      prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM "Message"
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `
    ]);

    // Calculer les statistiques d'engagement
    const engagementRate = totalUsers > 0 ? (activeUsers / totalUsers * 100).toFixed(1) : '0';
    const avgMessagesPerUser = totalUsers > 0 ? (totalMessages / totalUsers).toFixed(1) : '0';

    // Calculer les likes réciproques (matchs)
    const reciprocalLikes = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM "Like" l1
      INNER JOIN "Like" l2 ON l1."senderId" = l2."receiverId" AND l1."receiverId" = l2."senderId"
      WHERE l1."senderId" < l1."receiverId"
    `;
    const matchCount = (reciprocalLikes as any[])[0]?.count || 0;

    // Statistiques par tranche d'âge
    const ageGroups = await prisma.$queryRaw`
      SELECT 
        CASE 
          WHEN age < 25 THEN '18-24'
          WHEN age < 35 THEN '25-34'
          WHEN age < 45 THEN '35-44'
          WHEN age >= 45 THEN '45+'
          ELSE 'Non spécifié'
        END as age_group,
        COUNT(*) as count
      FROM "User"
      WHERE email NOT LIKE '%@system.local'
      GROUP BY age_group
      ORDER BY count DESC
    `;

    // Centres d'intérêt populaires
    const popularInterests = await prisma.$queryRaw`
      SELECT 
        interest,
        COUNT(*) as count
      FROM "User"
      CROSS JOIN UNNEST(interests) AS interest
      WHERE email NOT LIKE '%@system.local'
      GROUP BY interest
      ORDER BY count DESC
      LIMIT 10
    `;

    const stats = {
      // Statistiques générales
      totalUsers,
      totalMessages,
      totalLikes,
      totalDislikes,
      totalMatches: parseInt(matchCount.toString()),
      
      // Activité récente
      recentMessages,
      activeUsers,
      engagementRate: parseFloat(engagementRate),
      
      // Moyennes
      avgMessagesPerUser: parseFloat(avgMessagesPerUser),
      
      // Données démographiques
      ageGroups,
      topProfessions: topProfessions.map(p => ({
        profession: p.profession,
        count: p._count.profession
      })),
      topLocations: topLocations.map(l => ({
        location: l.location,
        count: l._count.location
      })),
      popularInterests,
      
      // Tendances
      messagesByDay,
      
      // Métadonnées
      generatedAt: new Date().toISOString(),
      chatType: 'universal_free',
      requiresMatch: false
    };

    console.log('✅ Statistiques générées:', {
      users: totalUsers,
      messages: totalMessages,
      matches: matchCount,
      engagement: `${engagementRate}%`
    });

    return NextResponse.json(stats);

  } catch (error: any) {
    console.error('❌ Erreur API statistiques chat:', error);
    return NextResponse.json({
      error: 'Erreur serveur',
      message: error.message,
      // Statistiques par défaut en cas d'erreur
      stats: {
        totalUsers: 0,
        totalMessages: 0,
        totalLikes: 0,
        totalDislikes: 0,
        totalMatches: 0,
        recentMessages: 0,
        activeUsers: 0,
        engagementRate: 0,
        avgMessagesPerUser: 0,
        generatedAt: new Date().toISOString(),
        chatType: 'universal_free',
        requiresMatch: false
      }
    }, { status: 500 });
  }
}

// Endpoint pour statistiques en temps réel (WebSocket ou polling)
export async function POST(request: NextRequest) {
  console.log('📊 API Statistiques temps réel');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { timeframe = '24h' } = body;

    const { prisma } = await import('@/lib/db');

    // Calculer la période selon le timeframe
    let periodStart: Date;
    switch (timeframe) {
      case '1h':
        periodStart = new Date(Date.now() - 60 * 60 * 1000);
        break;
      case '24h':
        periodStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        periodStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    const [messagesInPeriod, likesInPeriod, newUsersInPeriod] = await Promise.all([
      prisma.message.count({
        where: { createdAt: { gte: periodStart } }
      }),
      prisma.like.count({
        where: { createdAt: { gte: periodStart } }
      }),
      prisma.user.count({
        where: { createdAt: { gte: periodStart } }
      })
    ]);

    return NextResponse.json({
      timeframe,
      period: {
        start: periodStart.toISOString(),
        end: new Date().toISOString()
      },
      stats: {
        messages: messagesInPeriod,
        likes: likesInPeriod,
        newUsers: newUsersInPeriod
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Erreur API statistiques temps réel:', error);
    return NextResponse.json({
      error: 'Erreur serveur',
      message: error.message
    }, { status: 500 });
  }
}