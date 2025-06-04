// src/app/api/conversations/route.ts - Chat universel avec tous les utilisateurs
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🔍 API Conversations universelles');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { prisma } = await import('@/lib/db');
    const userId = session.user.id;

    // 1. Récupérer TOUS les utilisateurs (sauf l'utilisateur actuel)
    const allUsers = await prisma.user.findMany({
      where: {
        id: { not: userId }
      },
      select: {
        id: true,
        name: true,
        image: true,
        email: true
      },
      take: 50 // Limite pour éviter les problèmes de performance
    });

    console.log(`✅ ${allUsers.length} utilisateurs trouvés`);

    // 2. Pour chaque utilisateur, vérifier s'il y a des messages échangés
    const conversations = await Promise.all(
      allUsers.map(async (otherUser) => {
        // Chercher les messages entre ces 2 utilisateurs (dans les 2 sens)
        const messages = await prisma.message.findMany({
          where: {
            OR: [
              { senderId: userId, receiverId: otherUser.id },
              { senderId: otherUser.id, receiverId: userId }
            ]
          },
          orderBy: { createdAt: 'desc' },
          take: 1, // Juste le dernier message
          include: {
            sender: {
              select: { id: true, name: true, image: true }
            }
          }
        });

        // Compter les messages non lus
        const unreadCount = await prisma.message.count({
          where: {
            senderId: otherUser.id,
            receiverId: userId,
            readAt: null
          }
        });

        // Vérifier les likes - DÉPLACÉ AVANT hasMatch
        const sentLike = await prisma.like.findFirst({
          where: { senderId: userId, receiverId: otherUser.id }
        });

        const receivedLike = await prisma.like.findFirst({
          where: { senderId: otherUser.id, receiverId: userId }
        });

        // Vérifier s'il y a un match (likes mutuels)
        const hasMatch = !!(sentLike && receivedLike);

        const relationshipStatus = hasMatch 
          ? 'match' 
          : (sentLike && receivedLike) 
            ? 'mutual_like' 
            : sentLike 
              ? 'liked_by_me' 
              : receivedLike 
                ? 'liked_me' 
                : 'no_interaction';

        return {
          id: `conv_${userId}_${otherUser.id}`, // ID unique pour la conversation
          type: 'direct_message', // Type de conversation
          users: [
            {
              id: userId,
              name: session.user.name,
              image: session.user.image
            },
            otherUser
          ],
          lastMessage: messages[0] ? {
            id: messages[0].id,
            content: messages[0].content,
            senderId: messages[0].senderId,
            receiverId: messages[0].receiverId,
            matchId: null, // Pas de match associé
            createdAt: messages[0].createdAt.toISOString(),
            readAt: messages[0].readAt?.toISOString() || null,
            type: 'text',
            attachments: [],
            sender: messages[0].sender
          } : undefined,
          unreadCount,
          relationshipStatus,
          hasMatch: !!hasMatch,
          createdAt: messages[0]?.createdAt.toISOString() || new Date().toISOString(),
          // Métadonnées utiles
          metadata: {
            canMessage: true, // Toujours true pour le chat universel
            isMatch: !!hasMatch,
            sentLike: !!sentLike,
            receivedLike: !!receivedLike,
            mutualLike: !!(sentLike && receivedLike)
          }
        };
      })
    );

    // 3. Trier par activité récente (derniers messages en premier)
    const sortedConversations = conversations
      .filter(conv => conv.lastMessage || conv.relationshipStatus !== 'no_interaction') // Garder ceux avec messages ou interactions
      .sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
      });

    // 4. Ajouter aussi tous les utilisateurs sans interaction (pour permettre de démarrer des conversations)
    const usersWithoutInteraction = conversations
      .filter(conv => conv.relationshipStatus === 'no_interaction' && !conv.lastMessage)
      .slice(0, 10); // Limiter à 10 pour ne pas surcharger

    const allConversations = [...sortedConversations, ...usersWithoutInteraction];

    return NextResponse.json({
      conversations: allConversations,
      debug: {
        totalUsers: allUsers.length,
        conversationsWithMessages: sortedConversations.length,
        newUsersAvailable: usersWithoutInteraction.length,
        userId: userId
      }
    });

  } catch (error: any) {
    console.error('❌ Erreur API conversations:', error);
    return NextResponse.json({
      error: 'Erreur serveur',
      message: error.message
    }, { status: 500 });
  }
}

// POST pour démarrer une nouvelle conversation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { otherUserId } = await request.json();
    
    if (!otherUserId) {
      return NextResponse.json({ error: 'ID utilisateur requis' }, { status: 400 });
    }

    const { prisma } = await import('@/lib/db');

    // Vérifier que l'autre utilisateur existe
    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true, name: true, image: true }
    });

    if (!otherUser) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      conversation: {
        id: `conv_${session.user.id}_${otherUserId}`,
        type: 'direct_message',
        users: [
          {
            id: session.user.id,
            name: session.user.name,
            image: session.user.image
          },
          otherUser
        ],
        lastMessage: undefined,
        unreadCount: 0,
        relationshipStatus: 'new_conversation',
        hasMatch: false,
        createdAt: new Date().toISOString(),
        metadata: {
          canMessage: true,
          isNewConversation: true
        }
      },
      message: `Conversation initiée avec ${otherUser.name}`
    });

  } catch (error: any) {
    console.error('❌ Erreur création conversation:', error);
    return NextResponse.json({
      error: 'Erreur création conversation',
      message: error.message
    }, { status: 500 });
  }
}