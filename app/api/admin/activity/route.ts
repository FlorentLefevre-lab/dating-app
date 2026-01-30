import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAdminAccess } from '@/lib/admin/auth'
import { subDays, subHours, format } from 'date-fns'

export async function GET(request: Request) {
  const authResult = await verifyAdminAccess()
  if (!authResult.authorized) {
    return authResult.error
  }

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || '24h' // 24h, 7d, 30d

  try {
    const now = new Date()

    // Determine time range based on period
    let startDate: Date
    switch (period) {
      case '7d':
        startDate = subDays(now, 7)
        break
      case '30d':
        startDate = subDays(now, 30)
        break
      default: // 24h
        startDate = subHours(now, 24)
    }

    // Fetch all data in parallel
    const [
      // Online users
      onlineUsers,
      recentlyActiveUsers,

      // Real-time activity counts
      newUsersCount,
      newMatchesCount,
      newLikesCount,
      newPhotosCount,
      newReportsCount,
      profileViewsCount,

      // Recent activity feed
      recentUsers,
      recentMatches,
      recentReports,
      recentPhotos,

      // Engagement metrics
      totalLikesPeriod,
      totalMatchesPeriod,
      totalViewsPeriod,

      // Top users - most active (likes given)
      topActiveLikers,

      // Top users - most popular (likes received)
      topPopular,

      // Top users - most matches
      topMatchers,

      // Hourly activity for chart
      hourlyActivity,

      // Users by region
      usersByRegion,

      // Anomaly detection - high activity users
      highActivityUsers,

      // Inactive users
      inactiveUsersCount,

      // Incomplete profiles
      incompleteProfilesCount,
    ] = await Promise.all([
      // Online users (isOnline = true)
      prisma.user.findMany({
        where: { isOnline: true },
        select: {
          id: true,
          name: true,
          image: true,
          lastSeen: true,
          region: true,
          department: true,
        },
        take: 50,
        orderBy: { lastSeen: 'desc' },
      }),

      // Recently active (last 15 minutes)
      prisma.user.count({
        where: {
          lastSeen: { gte: subHours(now, 0.25) },
        },
      }),

      // New users in period
      prisma.user.count({
        where: { createdAt: { gte: startDate } },
      }),

      // New matches in period
      prisma.match.count({
        where: { createdAt: { gte: startDate } },
      }),

      // New likes in period
      prisma.like.count({
        where: { createdAt: { gte: startDate } },
      }),

      // New photos in period
      prisma.photo.count({
        where: { createdAt: { gte: startDate } },
      }),

      // New reports in period
      prisma.report.count({
        where: { createdAt: { gte: startDate } },
      }),

      // Profile views in period
      prisma.profileView.count({
        where: { createdAt: { gte: startDate } },
      }),

      // Recent new users (for feed)
      prisma.user.findMany({
        where: { createdAt: { gte: subHours(now, 24) } },
        select: {
          id: true,
          name: true,
          image: true,
          createdAt: true,
          region: true,
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),

      // Recent matches (for feed)
      prisma.match.findMany({
        where: { createdAt: { gte: subHours(now, 24) } },
        select: {
          id: true,
          createdAt: true,
          user1: { select: { id: true, name: true, image: true } },
          user2: { select: { id: true, name: true, image: true } },
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),

      // Recent reports (for feed)
      prisma.report.findMany({
        where: { createdAt: { gte: subHours(now, 24) } },
        select: {
          id: true,
          category: true,
          createdAt: true,
          reporter: { select: { id: true, name: true } },
          targetUser: { select: { id: true, name: true } },
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),

      // Recent photos uploaded
      prisma.photo.findMany({
        where: { createdAt: { gte: subHours(now, 24) } },
        select: {
          id: true,
          url: true,
          createdAt: true,
          moderationStatus: true,
          user: { select: { id: true, name: true } },
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),

      // Total likes in period (for engagement)
      prisma.like.count({
        where: { createdAt: { gte: startDate } },
      }),

      // Total matches in period (for engagement)
      prisma.match.count({
        where: { createdAt: { gte: startDate } },
      }),

      // Total profile views in period
      prisma.profileView.count({
        where: { createdAt: { gte: startDate } },
      }),

      // Top active users (most likes given)
      prisma.$queryRaw<Array<{ id: string; name: string | null; image: string | null; like_count: bigint }>>`
        SELECT u.id, u.name, u.image, COUNT(l.id) as like_count
        FROM users u
        JOIN likes l ON l."senderId" = u.id
        WHERE l."createdAt" >= ${startDate}
        GROUP BY u.id, u.name, u.image
        ORDER BY like_count DESC
        LIMIT 10
      `,

      // Most popular users (most likes received)
      prisma.$queryRaw<Array<{ id: string; name: string | null; image: string | null; like_count: bigint }>>`
        SELECT u.id, u.name, u.image, COUNT(l.id) as like_count
        FROM users u
        JOIN likes l ON l."receiverId" = u.id
        WHERE l."createdAt" >= ${startDate}
        GROUP BY u.id, u.name, u.image
        ORDER BY like_count DESC
        LIMIT 10
      `,

      // Top matchers
      prisma.$queryRaw<Array<{ id: string; name: string | null; image: string | null; match_count: bigint }>>`
        SELECT u.id, u.name, u.image,
          (SELECT COUNT(*) FROM matches m
           WHERE (m."user1Id" = u.id OR m."user2Id" = u.id)
           AND m."createdAt" >= ${startDate}) as match_count
        FROM users u
        WHERE EXISTS (
          SELECT 1 FROM matches m
          WHERE (m."user1Id" = u.id OR m."user2Id" = u.id)
          AND m."createdAt" >= ${startDate}
        )
        ORDER BY match_count DESC
        LIMIT 10
      `,

      // Hourly activity (likes per hour for last 24h)
      prisma.$queryRaw<Array<{ hour: Date; likes: bigint; matches: bigint }>>`
        WITH hours AS (
          SELECT generate_series(
            date_trunc('hour', ${subHours(now, 24)}::timestamp),
            date_trunc('hour', ${now}::timestamp),
            '1 hour'::interval
          ) as hour
        ),
        likes_per_hour AS (
          SELECT date_trunc('hour', "createdAt") as hour, COUNT(*) as cnt
          FROM likes
          WHERE "createdAt" >= ${subHours(now, 24)}
          GROUP BY date_trunc('hour', "createdAt")
        ),
        matches_per_hour AS (
          SELECT date_trunc('hour', "createdAt") as hour, COUNT(*) as cnt
          FROM matches
          WHERE "createdAt" >= ${subHours(now, 24)}
          GROUP BY date_trunc('hour', "createdAt")
        )
        SELECT
          h.hour,
          COALESCE(l.cnt, 0) as likes,
          COALESCE(m.cnt, 0) as matches
        FROM hours h
        LEFT JOIN likes_per_hour l ON l.hour = h.hour
        LEFT JOIN matches_per_hour m ON m.hour = h.hour
        ORDER BY h.hour ASC
      `,

      // Users by region
      prisma.$queryRaw<Array<{ region: string | null; count: bigint }>>`
        SELECT region, COUNT(*) as count
        FROM users
        WHERE "isOnline" = true AND region IS NOT NULL
        GROUP BY region
        ORDER BY count DESC
        LIMIT 10
      `,

      // Anomaly: users with high activity (>50 likes in last hour)
      prisma.$queryRaw<Array<{ id: string; name: string | null; like_count: bigint }>>`
        SELECT u.id, u.name, COUNT(l.id) as like_count
        FROM users u
        JOIN likes l ON l."senderId" = u.id
        WHERE l."createdAt" >= ${subHours(now, 1)}
        GROUP BY u.id, u.name
        HAVING COUNT(l.id) > 50
        ORDER BY like_count DESC
        LIMIT 10
      `,

      // Inactive users (no activity in 30 days)
      prisma.user.count({
        where: {
          OR: [
            { lastSeen: { lt: subDays(now, 30) } },
            { lastSeen: null },
          ],
          createdAt: { lt: subDays(now, 30) },
        },
      }),

      // Incomplete profiles (no photo or no bio)
      prisma.user.count({
        where: {
          OR: [
            { photos: { none: {} } },
            { bio: null },
            { bio: '' },
          ],
          createdAt: { lt: subDays(now, 7) }, // Created more than 7 days ago
        },
      }),
    ])

    // Calculate conversion rate (likes to matches)
    const conversionRate = totalLikesPeriod > 0
      ? ((totalMatchesPeriod / totalLikesPeriod) * 100).toFixed(1)
      : '0'

    // Build activity feed from all sources
    const activityFeed = [
      ...recentUsers.map(u => ({
        id: `user-${u.id}`,
        type: 'user_registered' as const,
        message: `${u.name || 'Nouvel utilisateur'} s'est inscrit${u.region ? ` (${u.region})` : ''}`,
        timestamp: u.createdAt,
        user: { name: u.name || undefined, image: u.image || undefined },
      })),
      ...recentMatches.map(m => ({
        id: `match-${m.id}`,
        type: 'match_created' as const,
        message: `${m.user1.name || 'Utilisateur'} et ${m.user2.name || 'Utilisateur'} ont matche`,
        timestamp: m.createdAt,
        metadata: { user1Id: m.user1.id, user2Id: m.user2.id },
      })),
      ...recentReports.map(r => ({
        id: `report-${r.id}`,
        type: 'report_created' as const,
        message: `Signalement (${r.category}) contre ${r.targetUser.name || 'un utilisateur'}`,
        timestamp: r.createdAt,
        metadata: { category: r.category },
      })),
      ...recentPhotos.map(p => ({
        id: `photo-${p.id}`,
        type: 'photo_uploaded' as const,
        message: `${p.user.name || 'Utilisateur'} a uploade une photo`,
        timestamp: p.createdAt,
        user: { name: p.user.name || undefined },
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
     .slice(0, 20)

    // Format hourly activity for chart
    const hourlyChartData = hourlyActivity.map(h => ({
      hour: format(new Date(h.hour), 'HH:mm'),
      likes: Number(h.likes),
      matches: Number(h.matches),
    }))

    // Format top users
    const formattedTopLikers = topActiveLikers.map(u => ({
      id: u.id,
      name: u.name,
      image: u.image,
      count: Number(u.like_count),
    }))

    const formattedTopPopular = topPopular.map(u => ({
      id: u.id,
      name: u.name,
      image: u.image,
      count: Number(u.like_count),
    }))

    const formattedTopMatchers = topMatchers.map(u => ({
      id: u.id,
      name: u.name,
      image: u.image,
      count: Number(u.match_count),
    }))

    // Format regions
    const formattedRegions = usersByRegion.map(r => ({
      region: r.region || 'Non renseigne',
      count: Number(r.count),
    }))

    // Format anomalies
    const anomalies = highActivityUsers.map(u => ({
      id: u.id,
      name: u.name,
      likesLastHour: Number(u.like_count),
      type: 'high_activity' as const,
    }))

    return NextResponse.json({
      success: true,
      data: {
        // Real-time stats
        realtime: {
          onlineCount: onlineUsers.length,
          recentlyActive: recentlyActiveUsers,
          onlineUsers: onlineUsers.slice(0, 20),
        },

        // Period stats
        periodStats: {
          period,
          newUsers: newUsersCount,
          newMatches: newMatchesCount,
          newLikes: newLikesCount,
          newPhotos: newPhotosCount,
          newReports: newReportsCount,
          profileViews: profileViewsCount,
        },

        // Engagement metrics
        engagement: {
          totalLikes: totalLikesPeriod,
          totalMatches: totalMatchesPeriod,
          totalViews: totalViewsPeriod,
          conversionRate: parseFloat(conversionRate),
        },

        // Activity feed
        activityFeed,

        // Charts
        charts: {
          hourlyActivity: hourlyChartData,
          usersByRegion: formattedRegions,
        },

        // Top users
        topUsers: {
          mostActive: formattedTopLikers,
          mostPopular: formattedTopPopular,
          mostMatches: formattedTopMatchers,
        },

        // Alerts
        alerts: {
          anomalies,
          inactiveUsers: inactiveUsersCount,
          incompleteProfiles: incompleteProfilesCount,
        },
      },
      meta: {
        timestamp: now.toISOString(),
        period,
      },
    })
  } catch (error) {
    console.error('[ADMIN ACTIVITY] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la recuperation des donnees d\'activite' },
      { status: 500 }
    )
  }
}
