// src/app/api/matches/route.ts - CORRIGÉ AVEC LIKES BIDIRECTIONNELS
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth'; 
import { prisma } from '@/lib/db'; 

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 [MATCHES] Début de la requête');

    // 1. Vérifier l'authentification
    const session = await auth();
    
    if (!session?.user?.id) {
      console.log('❌ [MATCHES] Non authentifié');
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    console.log('👤 [MATCHES] User ID:', session.user.id);

    try {
      // 2. Récupérer les matches via likes bidirectionnels (comme dans vos logs)
      console.log('🔄 [MATCHES] Recherche des likes bidirectionnels...');
      
      const matchesData = await prisma.$queryRaw<Array<{senderId: string, receiverId: string}>>`
        SELECT DISTINCT l1."senderId", l1."receiverId"
        FROM "likes" l1
        INNER JOIN "likes" l2 ON l1."senderId" = l2."receiverId" AND l1."receiverId" = l2."senderId"
        WHERE l1."receiverId" = ${session.user.id}
      `;

      console.log(`📋 [MATCHES] ${matchesData.length} matches trouvés via likes bidirectionnels`);
      console.log('📋 [MATCHES] Données brutes:', matchesData);

      if (matchesData.length === 0) {
        console.log('ℹ️ [MATCHES] Aucun match trouvé pour user:', session.user.id);
        
        // Debug: vérifier s'il y a des likes du tout
        const totalLikesReceived = await prisma.like.count({
          where: { receiverId: session.user.id }
        });
        
        const totalLikesSent = await prisma.like.count({
          where: { senderId: session.user.id }
        });
        
        console.log(`📊 [MATCHES] Debug - Likes reçus: ${totalLikesReceived}, Likes envoyés: ${totalLikesSent}`);
        
        return NextResponse.json({
          success: true,
          data: [],
          count: 0,
          debug: {
            totalLikesReceived,
            totalLikesSent,
            userId: session.user.id
          },
          message: 'Aucun match trouvé'
        });
      }

      // 3. Récupérer les détails des utilisateurs matchés
      const matchedUserIds = matchesData.map(match => match.senderId);
      console.log('👥 [MATCHES] IDs des utilisateurs matchés:', matchedUserIds);
      
      const matchedUsers = await prisma.user.findMany({
        where: {
          id: { in: matchedUserIds }
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          age: true,
          bio: true,
          location: true,
          profession: true,
          gender: true,
          isOnline: true,
          lastSeen: true,
          createdAt: true
        }
      });

      console.log(`👥 [MATCHES] ${matchedUsers.length} utilisateurs matchés récupérés`);

      // 4. Récupérer la date du premier like pour chaque match
      console.log('📅 [MATCHES] Récupération des dates de likes...');
      
      const likesData = await prisma.like.findMany({
        where: {
          OR: [
            { senderId: session.user.id, receiverId: { in: matchedUserIds } },
            { senderId: { in: matchedUserIds }, receiverId: session.user.id }
          ]
        },
        select: {
          senderId: true,
          receiverId: true,
          createdAt: true
        },
        orderBy: { createdAt: 'asc' }
      });

      console.log(`📅 [MATCHES] ${likesData.length} likes récupérés pour les dates`);

      // 5. Formater les données pour le frontend
      const formattedMatches = matchedUsers.map(user => {
        // Trouver la date du premier like pour ce match
        const userLikes = likesData.filter(like => 
          (like.senderId === user.id && like.receiverId === session.user.id) ||
          (like.senderId === session.user.id && like.receiverId === user.id)
        );
        
        const firstLike = userLikes.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )[0];

        const matchData = {
          id: `match-${session.user.id}-${user.id}`, // ID artificiel pour le match
          userId: user.id,
          userName: user.name || 'Utilisateur',
          userImage: user.image,
          userAge: user.age,
          userBio: user.bio,
          userLocation: user.location,
          userProfession: user.profession,
          userGender: user.gender,
          isOnline: user.isOnline || false,
          lastSeen: user.lastSeen,
          matchedAt: firstLike?.createdAt || user.createdAt,
          // Générer l'ID du channel Stream de manière cohérente
          channelId: [session.user.id, user.id].sort().join('-')
        };
        
        console.log(`👤 [MATCHES] Match formaté:`, {
          userName: matchData.userName,
          userId: matchData.userId,
          channelId: matchData.channelId
        });
        
        return matchData;
      });

      // 6. Trier par date de match (plus récent en premier)
      formattedMatches.sort((a, b) => 
        new Date(b.matchedAt).getTime() - new Date(a.matchedAt).getTime()
      );

      console.log('✅ [MATCHES] Données formatées:', formattedMatches.length, 'matches');

      return NextResponse.json({
        success: true,
        data: formattedMatches,
        count: formattedMatches.length,
        method: 'likes_bidirectionnels',
        debug: {
          rawMatches: matchesData.length,
          usersFound: matchedUsers.length,
          likesFound: likesData.length,
          currentUserId: session.user.id
        }
      });

    } catch (prismaError) {
      console.error('❌ [MATCHES] Erreur Prisma:', prismaError);
      
      // Si les tables likes n'existent pas non plus
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        message: 'Système de matches non configuré',
        error: prismaError instanceof Error ? prismaError.message : 'Erreur inconnue'
      });
    }

  } catch (error) {
    console.error('❌ [MATCHES] Erreur générale:', error);
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération des matches',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

// POST - Créer un nouveau "match" en ajoutant un like
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { targetUserId } = await request.json();

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'ID de l\'utilisateur cible requis' },
        { status: 400 }
      );
    }

    try {
      // Vérifier que l'utilisateur cible existe
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true,
          name: true,
          image: true,
          age: true,
          location: true
        }
      });

      if (!targetUser) {
        return NextResponse.json(
          { error: 'Utilisateur introuvable' },
          { status: 404 }
        );
      }

      // Vérifier qu'un like n'existe pas déjà
      const existingLike = await prisma.like.findFirst({
        where: {
          senderId: session.user.id,
          receiverId: targetUserId
        }
      });

      if (existingLike) {
        return NextResponse.json(
          { error: 'Like déjà donné' },
          { status: 409 }
        );
      }

      // Créer le like
      const newLike = await prisma.like.create({
        data: {
          senderId: session.user.id,
          receiverId: targetUserId
        }
      });

      // Vérifier si c'est un match (like bidirectionnel)
      const reverseLike = await prisma.like.findFirst({
        where: {
          senderId: targetUserId,
          receiverId: session.user.id
        }
      });

      const isMatch = !!reverseLike;

      console.log(`✅ [MATCHES] ${isMatch ? 'MATCH' : 'Like'} créé avec ${targetUser.name}`);

      return NextResponse.json({
        success: true,
        data: {
          likeId: newLike.id,
          isMatch,
          targetUser: {
            id: targetUser.id,
            name: targetUser.name,
            image: targetUser.image,
            age: targetUser.age,
            location: targetUser.location
          },
          channelId: isMatch ? [session.user.id, targetUser.id].sort().join('-') : null
        }
      });

    } catch (prismaError) {
      console.error('❌ [MATCHES] Erreur Prisma POST:', prismaError);
      return NextResponse.json(
        { error: 'Erreur lors de la création du like/match' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ [MATCHES] Erreur POST:', error);
    
    return NextResponse.json(
      { error: 'Erreur lors de la création du match' },
      { status: 500 }
    );
  }
}