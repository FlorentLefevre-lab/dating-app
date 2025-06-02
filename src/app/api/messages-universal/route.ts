// src/app/api/messages-pure-universal/route.ts - API Messages pure universelle (SANS Match)
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🔍 API Messages Pure Universelle (SANS Match)');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const otherUserId = searchParams.get('otherUserId');
    const conversationId = searchParams.get('conversationId');
    
    if (!otherUserId && !conversationId) {
      return NextResponse.json({ 
        error: 'Paramètre requis: otherUserId ou conversationId' 
      }, { status: 400 });
    }

    const { prisma } = await import('@/lib/db');
    const userId = session.user.id;

    let messages = [];
    let otherUser = null;
    let finalOtherUserId = otherUserId;

    // CAS 1: Récupération via conversationId (format: conv_userId1_userId2)
    if (conversationId && conversationId.startsWith('conv_')) {
      console.log('🆔 Récupération via conversationId:', conversationId);
      
      // Extraire les IDs des utilisateurs depuis conversationId
      const parts = conversationId.replace('conv_', '').split('_');
      if (parts.length >= 2) {
        // Reconstituer les emails/IDs
        const midpoint = Math.floor(parts.length / 2);
        const user1Id = parts.slice(0, midpoint).join('@').replace(/_/g, '.');
        const user2Id = parts.slice(midpoint).join('@').replace(/_/g, '.');
        
        finalOtherUserId = user1Id === userId ? user2Id : user1Id;
        console.log('📝 IDs extraits:', { user1Id, user2Id, finalOtherUserId });
      }
    }

    // CAS 2: Vérifier que l'autre utilisateur existe
    if (finalOtherUserId) {
      console.log('👤 Recherche utilisateur:', finalOtherUserId);
      
      otherUser = await prisma.user.findFirst({
        where: {
          OR: [
            { id: finalOtherUserId },
            { email: finalOtherUserId }
          ]
        },
        select: { id: true, name: true, image: true, email: true, bio: true, age: true, location: true }
      });

      if (!otherUser) {
        return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
      }

      // Récupérer TOUS les messages entre ces deux utilisateurs (sans référence à match)
      messages = await prisma.message.findMany({
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
        orderBy: { createdAt: 'asc' },
        take: 100
      });
    }

    console.log(`✅ ${messages.length} messages purs récupérés`);

    // Marquer les messages reçus comme lus
    try {
      if (otherUser) {
        const updateResult = await prisma.message.updateMany({
          where: {
            senderId: otherUser.id,
            receiverId: userId,
            readAt: null
          },
          data: { readAt: new Date() }
        });
        console.log(`✅ ${updateResult.count} messages marqués comme lus`);
      }
    } catch (readError) {
      console.warn('⚠️ Erreur marquage comme lu:', readError);
    }

    // Formatage des messages
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      createdAt: msg.createdAt.toISOString(),
      readAt: msg.readAt?.toISOString() || null,
      type: 'text',
      timestamp: msg.createdAt.toISOString(),
      sender: msg.sender
    }));

    return NextResponse.json({
      messages: formattedMessages,
      conversation: {
        type: 'pure_universal',
        otherUser,
        currentUser: {
          id: userId,
          name: session.user.name,
          image: session.user.image,
          email: session.user.email
        },
        conversationId: conversationId || `conv_${[userId, otherUser?.id].sort().join('_').replace(/[@.]/g, '_')}`
      },
      debug: {
        messageCount: messages.length,
        otherUserId: otherUser?.id,
        conversationId,
        chatType: 'Pure Universal (No Match System)',
        hasMatchSystem: false
      }
    });

  } catch (error: any) {
    console.error('❌ Erreur API messages pure universelle:', error);
    return NextResponse.json({
      error: 'Erreur serveur',
      message: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log('📤 API Messages Pure Universelle - Envoi');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { content, receiverId, otherUserId } = body;

    if (!content || (!receiverId && !otherUserId)) {
      return NextResponse.json({ error: 'Contenu et destinataire requis' }, { status: 400 });
    }

    const { prisma } = await import('@/lib/db');
    const senderId = session.user.id;

    let finalReceiverId = receiverId || otherUserId;

    // Vérifier que le destinataire existe
    const receiver = await prisma.user.findFirst({
      where: {
        OR: [
          { id: finalReceiverId },
          { email: finalReceiverId }
        ]
      },
      select: { id: true, name: true, image: true, email: true }
    });

    if (!receiver) {
      return NextResponse.json({ error: 'Destinataire introuvable' }, { status: 404 });
    }

    // Créer le message pur universel (SANS matchId, SANS référence à Match)
    const message = await prisma.message.create({
      data: {
        content,
        senderId,
        receiverId: receiver.id
        // AUCUNE référence à match - Chat 100% libre !
      },
      include: {
        sender: {
          select: { id: true, name: true, image: true, email: true }
        }
      }
    });

    console.log('✅ Message pur universel créé:', message.id);

    const formattedMessage = {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      receiverId: message.receiverId,
      createdAt: message.createdAt.toISOString(),
      readAt: message.readAt?.toISOString() || null,
      type: 'text',
      timestamp: message.createdAt.toISOString(),
      sender: message.sender
    };

    return NextResponse.json({
      message: formattedMessage,
      success: true,
      chatType: 'pure_universal',
      conversationId: `conv_${[senderId, receiver.id].sort().join('_').replace(/[@.]/g, '_')}`
    });

  } catch (error: any) {
    console.error('❌ Erreur envoi message pur universel:', error);
    return NextResponse.json({
      error: 'Erreur envoi message',
      message: error.message
    }, { status: 500 });
  }
}