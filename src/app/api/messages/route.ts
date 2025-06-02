// src/app/api/messages/route.ts - STRUCTURE CORRIGÉE POUR TA DB
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🔍 API Messages GET appelée');
  
  try {
    // 1. Authentification
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log('❌ Utilisateur non authentifié');
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    console.log('✅ Utilisateur authentifié:', session.user.id);

    // 2. Récupération du matchId
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');
    
    if (!matchId) {
      console.log('❌ Match ID manquant');
      return NextResponse.json({ error: 'Match ID requis' }, { status: 400 });
    }

    console.log('🔍 Récupération messages pour match:', matchId);

    // 3. Import Prisma
    const { prisma } = await import('@/lib/db');

    // 4. Vérifier que l'utilisateur fait partie de ce match (structure many-to-many)
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        users: {
          some: {
            id: session.user.id  // L'utilisateur doit être dans les users du match
          }
        }
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    });

    if (!match) {
      console.log('❌ Match non trouvé ou accès refusé');
      return NextResponse.json({ error: 'Match introuvable' }, { status: 404 });
    }

    console.log('✅ Match validé, utilisateurs:', match.users.map(u => u.name));

    // 5. Récupérer les messages du match
    const messages = await prisma.message.findMany({
      where: { matchId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      },
      orderBy: { createdAt: 'asc' },
      take: 100
    });

    console.log(`✅ ${messages.length} messages récupérés`);

    // 6. Marquer les messages comme lus (en arrière-plan)
    try {
      const updateResult = await prisma.message.updateMany({
        where: {
          matchId,
          senderId: { not: session.user.id }, // Messages reçus
          readAt: null // Non encore lus
        },
        data: { readAt: new Date() }
      });
      console.log(`✅ ${updateResult.count} messages marqués comme lus`);
    } catch (readError) {
      console.warn('⚠️ Erreur marquage comme lu:', readError);
    }

    // 7. Formatage des messages
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      matchId: msg.matchId,
      createdAt: msg.createdAt.toISOString(),
      readAt: msg.readAt?.toISOString() || null,
      type: 'text', // Ajouter un champ type si nécessaire
      attachments: [], // Ajouter des attachments si nécessaire
      sender: msg.sender
    }));

    return NextResponse.json({ 
      messages: formattedMessages,
      debug: {
        matchId,
        messageCount: messages.length,
        userId: session.user.id,
        matchUsers: match.users.map(u => ({ id: u.id, name: u.name }))
      }
    });

  } catch (error: any) {
    console.error('❌ Erreur API messages:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur',
      message: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log('🔍 API Messages POST appelée');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { content, matchId, receiverId, type = 'text', attachments = [] } = body;

    if (!content || !matchId || !receiverId) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    const { prisma } = await import('@/lib/db');

    // Vérifier le match avec la structure many-to-many
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        users: {
          some: {
            id: session.user.id
          }
        }
      }
    });

    if (!match) {
      return NextResponse.json({ error: 'Match introuvable' }, { status: 404 });
    }

    // Créer le message
    const message = await prisma.message.create({
      data: {
        content,
        senderId: session.user.id,
        receiverId,
        matchId
        // Note: type et attachments peuvent être ajoutés au schéma si nécessaire
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    });

    console.log('✅ Message créé:', message.id);

    const formattedMessage = {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      receiverId: message.receiverId,
      matchId: message.matchId,
      createdAt: message.createdAt.toISOString(),
      readAt: message.readAt?.toISOString() || null,
      type: type,
      attachments: attachments,
      sender: message.sender
    };

    return NextResponse.json({ 
      message: formattedMessage
    });

  } catch (error: any) {
    console.error('❌ Erreur création message:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}