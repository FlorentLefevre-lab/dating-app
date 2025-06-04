// src/app/api/chat/route.ts - VERSION AMÉLIORÉE AVEC PERSISTANCE ROBUSTE
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Types pour la validation
interface SendMessageBody {
  content: string;
  receiverId: string;
  conversationId?: string;
  clientMessageId?: string; // ID côté client pour éviter les doublons
  timestamp?: string;
}

interface GetMessagesParams {
  otherUserId?: string;
  conversationId?: string;
  lastMessageId?: string; // Pour la pagination
  limit?: number;
  sinceTimestamp?: string; // Pour la synchronisation
}

export async function GET(request: NextRequest) {
  console.log('🔍 API Messages - Récupération avec synchronisation');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params: GetMessagesParams = {
      otherUserId: searchParams.get('otherUserId') || undefined,
      conversationId: searchParams.get('conversationId') || undefined,
      lastMessageId: searchParams.get('lastMessageId') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      sinceTimestamp: searchParams.get('sinceTimestamp') || undefined
    };

    // Récupérer l'utilisateur actuel
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true, email: true, image: true }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const userId = currentUser.id;
    let otherUser = null;
    let finalOtherUserId = params.otherUserId;

    // Extraire l'autre utilisateur depuis conversationId si nécessaire
    if (params.conversationId && params.conversationId.startsWith('conv_')) {
      const parts = params.conversationId.replace('conv_', '').split('_');
      if (parts.length >= 2) {
        const user1Id = parts[0];
        const user2Id = parts[1];
        finalOtherUserId = user1Id === userId ? user2Id : user1Id;
      }
    }

    if (!finalOtherUserId) {
      return NextResponse.json({ 
        error: 'Paramètre requis: otherUserId ou conversationId' 
      }, { status: 400 });
    }

    // Vérifier que l'autre utilisateur existe
    otherUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: finalOtherUserId },
          { email: finalOtherUserId }
        ]
      },
      select: { 
        id: true, 
        name: true, 
        image: true, 
        email: true, 
        bio: true, 
        age: true, 
        location: true,
        photos: {
          select: { url: true, isPrimary: true },
          orderBy: { isPrimary: 'desc' }
        }
      }
    });

    if (!otherUser) {
      return NextResponse.json({ 
        error: 'Utilisateur introuvable',
        requestedUserId: finalOtherUserId 
      }, { status: 404 });
    }

    // Construire la requête pour les messages
    let messageQuery: any = {
      where: {
        OR: [
          { senderId: userId, receiverId: otherUser.id },
          { senderId: otherUser.id, receiverId: userId }
        ]
      },
      include: {
        sender: {
          select: { id: true, name: true, image: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: params.limit || 50
    };

    // Pagination ou synchronisation
    if (params.sinceTimestamp) {
      // Mode synchronisation - récupérer tous les messages depuis un timestamp
      messageQuery.where = {
        ...messageQuery.where,
        createdAt: {
          gt: new Date(params.sinceTimestamp)
        }
      };
      messageQuery.orderBy = { createdAt: 'asc' }; // Ordre chronologique pour la sync
    } else if (params.lastMessageId) {
      // Mode pagination - récupérer les messages avant un certain message
      const lastMessage = await prisma.message.findUnique({
        where: { id: params.lastMessageId },
        select: { createdAt: true }
      });
      
      if (lastMessage) {
        messageQuery.where = {
          ...messageQuery.where,
          createdAt: {
            lt: lastMessage.createdAt
          }
        };
      }
    }

    // Récupérer les messages
    const messages = await prisma.message.findMany(messageQuery);

    console.log(`✅ ${messages.length} messages récupérés entre ${userId} et ${otherUser.id}`);

    // Marquer les messages reçus comme lus (seulement si ce n'est pas une synchronisation)
    if (!params.sinceTimestamp) {
      try {
        const updateResult = await prisma.message.updateMany({
          where: {
            senderId: otherUser.id,
            receiverId: userId,
            readAt: null
          },
          data: { readAt: new Date() }
        });
        console.log(`✅ ${updateResult.count} messages marqués comme lus`);
      } catch (readError) {
        console.warn('⚠️ Erreur marquage comme lu:', readError);
      }
    }

    // Formater les messages
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      createdAt: msg.createdAt.toISOString(),
      readAt: msg.readAt?.toISOString() || null,
      type: 'text',
      timestamp: msg.createdAt.toISOString(),
      sender: msg.sender,
      status: msg.readAt ? 'read' : 'delivered'
    }));

    // Si mode pagination, inverser pour avoir l'ordre chronologique
    if (!params.sinceTimestamp && !params.lastMessageId) {
      formattedMessages.reverse();
    }

    const conversationIdFormatted = params.conversationId || `conv_${[userId, otherUser.id].sort().join('_')}`;

    // Récupérer les métadonnées de la conversation
    const totalMessageCount = await prisma.message.count({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUser.id },
          { senderId: otherUser.id, receiverId: userId }
        ]
      }
    });

    const unreadCount = await prisma.message.count({
      where: {
        senderId: otherUser.id,
        receiverId: userId,
        readAt: null
      }
    });

    return NextResponse.json({
      success: true,
      messages: formattedMessages,
      conversation: {
        type: 'direct_message',
        otherUser: {
          ...otherUser,
          image: otherUser.photos.find(p => p.isPrimary)?.url || otherUser.photos[0]?.url || otherUser.image,
          photos: undefined
        },
        currentUser: {
          id: userId,
          name: currentUser.name || session.user.name,
          image: currentUser.image || session.user.image,
          email: currentUser.email
        },
        conversationId: conversationIdFormatted,
        totalMessages: totalMessageCount,
        unreadCount: unreadCount
      },
      pagination: {
        hasMore: formattedMessages.length === params.limit,
        lastMessageId: formattedMessages.length > 0 ? formattedMessages[formattedMessages.length - 1].id : null,
        oldestMessageId: formattedMessages.length > 0 ? formattedMessages[0].id : null
      },
      synchronization: {
        serverTimestamp: new Date().toISOString(),
        isSyncMode: !!params.sinceTimestamp,
        messagesCount: formattedMessages.length
      },
      debug: {
        messageCount: formattedMessages.length,
        currentUserId: userId,
        otherUserId: otherUser.id,
        conversationId: conversationIdFormatted,
        totalMessages: totalMessageCount,
        unreadCount: unreadCount
      }
    });

  } catch (error: any) {
    console.error('❌ Erreur API messages:', error);
    return NextResponse.json({
      error: 'Erreur serveur',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log('📤 API Messages - Envoi avec persistance robuste');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body: SendMessageBody = await request.json();
    const { content, receiverId, conversationId, clientMessageId, timestamp } = body;

    // Validation
    if (!content || !content.trim() || !receiverId) {
      return NextResponse.json({ 
        error: 'Contenu et destinataire requis',
        received: { content, receiverId }
      }, { status: 400 });
    }

    if (content.length > 1000) {
      return NextResponse.json({ 
        error: 'Message trop long (max 1000 caractères)' 
      }, { status: 400 });
    }

    // Récupérer l'utilisateur actuel
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true, email: true, image: true }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const senderId = currentUser.id;
    const sanitizedContent = content.trim().replace(/\s+/g, ' ');

    // Vérifier que le destinataire existe
    const receiver = await prisma.user.findFirst({
      where: {
        OR: [
          { id: receiverId },
          { email: receiverId }
        ]
      },
      select: { id: true, name: true, image: true, email: true }
    });

    if (!receiver) {
      return NextResponse.json({ 
        error: 'Destinataire introuvable',
        requestedReceiverId: receiverId
      }, { status: 404 });
    }

    // Vérifier les doublons si clientMessageId est fourni
    if (clientMessageId) {
      const existingMessage = await prisma.message.findFirst({
        where: {
          senderId,
          receiverId: receiver.id,
          content: sanitizedContent,
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000) // Dans les 5 dernières minutes
          }
        }
      });

      if (existingMessage) {
        console.log('⚠️ Doublon détecté, renvoi du message existant');
        return NextResponse.json({
          success: true,
          message: {
            id: existingMessage.id,
            content: existingMessage.content,
            senderId: existingMessage.senderId,
            receiverId: existingMessage.receiverId,
            createdAt: existingMessage.createdAt.toISOString(),
            readAt: existingMessage.readAt?.toISOString() || null,
            type: 'text',
            timestamp: existingMessage.createdAt.toISOString(),
            sender: currentUser,
            status: 'delivered',
            isDuplicate: true
          },
          conversationId: conversationId || `conv_${[senderId, receiver.id].sort().join('_')}`,
          chatType: 'duplicate_detected'
        });
      }
    }

    // Créer le message avec transaction pour assurer la cohérence
    const message = await prisma.$transaction(async (tx) => {
      // Créer le message
      const newMessage = await tx.message.create({
        data: {
          content: sanitizedContent,
          senderId,
          receiverId: receiver.id,
          createdAt: timestamp ? new Date(timestamp) : new Date()
        },
        include: {
          sender: {
            select: { id: true, name: true, image: true, email: true }
          }
        }
      });

      // Mettre à jour les statistiques de conversation (optionnel)
      // Vous pourriez ajouter une table ConversationStats ici

      return newMessage;
    });

    console.log('✅ Message persisté avec succès:', {
      id: message.id,
      from: senderId,
      to: receiver.id,
      clientId: clientMessageId
    });

    const formattedMessage = {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      receiverId: message.receiverId,
      createdAt: message.createdAt.toISOString(),
      readAt: message.readAt?.toISOString() || null,
      type: 'text',
      timestamp: message.createdAt.toISOString(),
      sender: {
        id: currentUser.id,
        name: currentUser.name,
        image: currentUser.image,
        email: currentUser.email
      },
      status: 'delivered',
      clientMessageId
    };

    // TODO: Ici vous pourriez ajouter l'envoi via Socket.IO pour les notifications temps réel
    // ou via un système de queue pour les notifications push

    return NextResponse.json({
      success: true,
      message: formattedMessage,
      conversationId: conversationId || `conv_${[senderId, receiver.id].sort().join('_')}`,
      chatType: 'persistent_message',
      serverTimestamp: new Date().toISOString(),
      debug: {
        originalSenderId: senderId,
        resolvedReceiverId: receiver.id,
        sessionEmail: session.user.email,
        messageId: message.id,
        clientMessageId
      }
    });

  } catch (error: any) {
    console.error('❌ Erreur envoi message:', error);
    return NextResponse.json({
      error: 'Erreur envoi message',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// Nouvelle route pour la synchronisation des messages manqués
export async function PATCH(request: NextRequest) {
  console.log('🔄 API Messages - Synchronisation');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { lastSyncTimestamp, conversationId } = await request.json();

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    // Récupérer tous les messages reçus depuis la dernière synchronisation
    const missedMessages = await prisma.message.findMany({
      where: {
        receiverId: currentUser.id,
        createdAt: {
          gt: new Date(lastSyncTimestamp)
        },
        ...(conversationId && {
          OR: [
            { senderId: conversationId.split('_')[1] },
            { senderId: conversationId.split('_')[2] }
          ]
        })
      },
      include: {
        sender: {
          select: { id: true, name: true, image: true, email: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const formattedMessages = missedMessages.map(msg => ({
      id: msg.id,
      content: msg.content,
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      createdAt: msg.createdAt.toISOString(),
      readAt: msg.readAt?.toISOString() || null,
      type: 'text',
      timestamp: msg.createdAt.toISOString(),
      sender: msg.sender,
      status: 'delivered'
    }));

    console.log(`🔄 ${formattedMessages.length} messages manqués synchronisés`);

    return NextResponse.json({
      success: true,
      missedMessages: formattedMessages,
      syncTimestamp: new Date().toISOString(),
      count: formattedMessages.length
    });

  } catch (error: any) {
    console.error('❌ Erreur synchronisation messages:', error);
    return NextResponse.json({
      error: 'Erreur synchronisation',
      message: error.message
    }, { status: 500 });
  }
}