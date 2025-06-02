// src/app/api/debug/all-users/route.ts - Lister tous les utilisateurs
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('👥 LISTE: Tous les utilisateurs de la base');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { prisma } = await import('@/lib/db');

    // Récupérer TOUS les utilisateurs avec leurs stats
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        age: true,
        bio: true,
        location: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Pour chaque utilisateur, calculer leurs stats d'interaction
    const usersWithStats = await Promise.all(
      allUsers.map(async (user) => {
        const sentLikes = await prisma.like.count({
          where: { senderId: user.id }
        });

        const receivedLikes = await prisma.like.count({
          where: { receiverId: user.id }
        });

        const matches = await prisma.match.count({
          where: {
            users: { some: { id: user.id } }
          }
        });

        const sentMessages = await prisma.message.count({
          where: { senderId: user.id }
        });

        const receivedMessages = await prisma.message.count({
          where: { receiverId: user.id }
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt.toISOString(),
          profile: {
            age: user.age,
            bio: user.bio,
            location: user.location
          },
          stats: {
            sentLikes,
            receivedLikes,
            matches,
            sentMessages,
            receivedMessages,
            totalMessages: sentMessages + receivedMessages
          },
          isCurrentUser: user.id === session.user.id,
          activityLevel: sentLikes + receivedLikes + sentMessages + receivedMessages
        };
      })
    );

    // Trier par niveau d'activité
    const sortedUsers = usersWithStats.sort((a, b) => b.activityLevel - a.activityLevel);

    // Séparer utilisateur actuel des autres
    const currentUser = sortedUsers.find(u => u.isCurrentUser);
    const otherUsers = sortedUsers.filter(u => !u.isCurrentUser);

    // Calculer des statistiques générales
    const totalStats = {
      totalUsers: allUsers.length,
      activeUsers: sortedUsers.filter(u => u.activityLevel > 0).length,
      usersWithMatches: sortedUsers.filter(u => u.stats.matches > 0).length,
      usersWithoutMatches: sortedUsers.filter(u => u.stats.matches === 0).length,
      averageLikesPerUser: Math.round(sortedUsers.reduce((sum, u) => sum + u.stats.sentLikes + u.stats.receivedLikes, 0) / allUsers.length),
      totalLikes: sortedUsers.reduce((sum, u) => sum + u.stats.sentLikes, 0),
      totalMatches: sortedUsers.reduce((sum, u) => sum + u.stats.matches, 0) / 2, // Divisé par 2 car chaque match est compté deux fois
      totalMessages: sortedUsers.reduce((sum, u) => sum + u.stats.totalMessages, 0) / 2 // Même raison
    };

    return NextResponse.json({
      currentUser,
      otherUsers,
      totalStats,
      recommendations: [
        currentUser?.stats.sentLikes === 0 ? '⚠️ Vous n\'avez envoyé aucun like' : `✅ Vous avez envoyé ${currentUser?.stats.sentLikes} like(s)`,
        currentUser?.stats.receivedLikes === 0 ? '⚠️ Vous n\'avez reçu aucun like' : `✅ Vous avez reçu ${currentUser?.stats.receivedLikes} like(s)`,
        currentUser?.stats.matches === 0 ? '❌ Vous n\'avez aucun match' : `🎯 Vous avez ${currentUser?.stats.matches} match(es)`,
        otherUsers.length === 0 ? '⚠️ Aucun autre utilisateur dans la base' : `👥 ${otherUsers.length} autre(s) utilisateur(s) disponible(s)`
      ],
      suggestedActions: [
        currentUser?.stats.sentLikes === 0 && otherUsers.length > 0 ? 'Utilisez POST /api/debug/create-likes pour créer des likes' : null,
        'Utilisez GET /api/debug/create-likes pour voir qui vous pouvez liker',
        'Utilisez POST /api/debug/create-likes avec createTestScenario:true pour créer un scénario complet'
      ].filter(Boolean)
    });

  } catch (error: any) {
    console.error('❌ Erreur liste utilisateurs:', error);
    return NextResponse.json({
      error: 'Erreur récupération utilisateurs',
      message: error.message
    }, { status: 500 });
  }
}