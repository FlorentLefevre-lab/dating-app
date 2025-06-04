// src/app/api/messages/route.ts - Récupérer les messages d'une conversation
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const otherUserId = searchParams.get('otherUserId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!otherUserId) {
      return NextResponse.json({ error: 'otherUserId requis' }, { status: 400 });
    }

    // Récupérer les messages entre les deux utilisateurs
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: session.user.id, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: session.user.id }
        ],
        deletedAt: null // Exclure les messages supprimés
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        attachments: true,
        reactions: {
          include: {
            user: {
              select: { id: true, name: true }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    });

    // Marquer les messages comme lus
    await prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: session.user.id,
        readAt: null
      },
      data: {
        readAt: new Date()
      }
    });

    // Formater les messages pour le frontend
    const formattedMessages = messages.reverse().map(message => ({
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      receiverId: message.receiverId,
      timestamp: message.createdAt.toISOString(),
      fromCurrentUser: message.senderId === session.user.id,
      status: message.senderId === session.user.id 
        ? (message.readAt ? 'read' : message.deliveredAt ? 'delivered' : 'sent')
        : 'received',
      sender: message.sender,
      attachments: message.attachments,
      reactions: message.reactions,
      editedAt: message.editedAt,
      replyToId: message.replyToId,
      clientId: message.clientId
    }));

    return NextResponse.json({
      success: true,
      messages: formattedMessages,
      hasMore: messages.length === limit
    });

  } catch (error) {
    console.error('Erreur récupération messages:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// src/app/api/messages/send/route.ts - Envoyer un message
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { content, receiverId, clientId, replyToId } = body;

    if (!content?.trim() || !receiverId) {
      return NextResponse.json(
        { error: 'Contenu et destinataire requis' }, 
        { status: 400 }
      );
    }

    // Vérifier si le message existe déjà (éviter les doublons)
    if (clientId) {
      const existingMessage = await prisma.message.findFirst({
        where: { clientId }
      });
      
      if (existingMessage) {
        return NextResponse.json({
          success: true,
          message: {
            id: existingMessage.id,
            isDuplicate: true
          }
        });
      }
    }

    // Créer le message dans la base de données
    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        senderId: session.user.id,
        receiverId,
        clientId,
        replyToId,
        status: 'SENT',
        deliveredAt: new Date() // Considéré comme livré immédiatement
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    });

    // Mettre à jour la conversation (lastMessageAt)
    const conversationId = [session.user.id, receiverId].sort().join('_');
    
    // Essayer de créer/mettre à jour une conversation directe
    await prisma.conversation.upsert({
      where: {
        id: conversationId
      },
      create: {
        id: conversationId,
        type: 'DIRECT',
        lastMessageAt: new Date(),
        members: {
          createMany: {
            data: [
              { userId: session.user.id },
              { userId: receiverId }
            ]
          }
        }
      },
      update: {
        lastMessageAt: new Date()
      }
    });

    // TODO: Envoyer via WebSocket si l'utilisateur est en ligne
    // io.to(receiverId).emit('new_message', formattedMessage);

    const formattedMessage = {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      receiverId: message.receiverId,
      timestamp: message.createdAt.toISOString(),
      fromCurrentUser: true,
      status: 'sent' as const,
      sender: message.sender,
      clientId: message.clientId
    };

    return NextResponse.json({
      success: true,
      message: formattedMessage
    });

  } catch (error) {
    console.error('Erreur envoi message:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// src/app/api/conversations/route.ts - Lister les conversations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer toutes les conversations où l'utilisateur a des messages
    const conversations = await prisma.$queryRaw`
      SELECT DISTINCT
        CASE 
          WHEN m.senderId = ${session.user.id} THEN m.receiverId
          ELSE m.senderId
        END as userId,
        MAX(m.createdAt) as lastActivity,
        COUNT(m.id) as messageCount,
        COUNT(CASE WHEN m.receiverId = ${session.user.id} AND m.readAt IS NULL THEN 1 END) as unreadCount
      FROM "Message" m
      WHERE (m.senderId = ${session.user.id} OR m.receiverId = ${session.user.id})
        AND m.deletedAt IS NULL
      GROUP BY userId
      ORDER BY lastActivity DESC
    ` as Array<{
      userId: string;
      lastActivity: Date;
      messageCount: number;
      unreadCount: number;
    }>;

    // Récupérer les détails des utilisateurs et derniers messages
    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conv) => {
        const user = await prisma.user.findUnique({
          where: { id: conv.userId },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            age: true,
            bio: true,
            location: true
          }
        });

        const lastMessage = await prisma.message.findFirst({
          where: {
            OR: [
              { senderId: session.user.id, receiverId: conv.userId },
              { senderId: conv.userId, receiverId: session.user.id }
            ],
            deletedAt: null
          },
          orderBy: { createdAt: 'desc' }
        });

        // Vérifier s'il y a un match mutuel
        const hasMatch = await prisma.like.findFirst({
          where: {
            senderId: session.user.id,
            receiverId: conv.userId
          }
        }).then(async (like) => {
          if (!like) return false;
          const reciprocalLike = await prisma.like.findFirst({
            where: {
              senderId: conv.userId,
              receiverId: session.user.id
            }
          });
          return !!reciprocalLike;
        });

        return {
          id: `conv_${[session.user.id, conv.userId].sort().join('_')}`,
          user,
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            senderId: lastMessage.senderId,
            createdAt: lastMessage.createdAt.toISOString()
          } : null,
          messageCount: Number(conv.messageCount),
          unreadCount: Number(conv.unreadCount),
          lastActivity: conv.lastActivity.toISOString(),
          relationshipStatus: hasMatch ? 'matched' : 'chatting',
          hasMatch
        };
      })
    );

    return NextResponse.json({
      success: true,
      conversations: conversationsWithDetails.filter(conv => conv.user)
    });

  } catch (error) {
    console.error('Erreur récupération conversations:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// src/app/api/messages/[messageId]/read/route.ts - Marquer comme lu
export async function POST(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { messageId } = params;

    // Marquer le message comme lu
    const message = await prisma.message.update({
      where: {
        id: messageId,
        receiverId: session.user.id // S'assurer que c'est bien le destinataire
      },
      data: {
        readAt: new Date()
      }
    });

    // TODO: Notifier l'expéditeur via WebSocket
    // io.to(message.senderId).emit('message_read', { messageId, readAt: message.readAt });

    return NextResponse.json({
      success: true,
      readAt: message.readAt
    });

  } catch (error) {
    console.error('Erreur marquage lecture:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// src/app/api/messages/sync/route.ts - Synchroniser les messages hors ligne
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { messages } = await request.json();

    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Format invalide' },
        { status: 400 }
      );
    }

    const results = [];

    for (const msg of messages) {
      try {
        // Vérifier si le message existe déjà
        const existing = await prisma.message.findFirst({
          where: { clientId: msg.clientId }
        });

        if (existing) {
          results.push({
            clientId: msg.clientId,
            status: 'duplicate',
            serverId: existing.id
          });
          continue;
        }

        // Créer le message
        const message = await prisma.message.create({
          data: {
            content: msg.content,
            senderId: session.user.id,
            receiverId: msg.receiverId,
            clientId: msg.clientId,
            status: 'SENT',
            deliveredAt: new Date(),
            createdAt: new Date(msg.timestamp)
          }
        });

        results.push({
          clientId: msg.clientId,
          status: 'success',
          serverId: message.id
        });

      } catch (error) {
        results.push({
          clientId: msg.clientId,
          status: 'error',
          error: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Erreur synchronisation:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}