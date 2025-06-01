// src/app/api/matches/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Récupérer la session
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Trouver l'utilisateur par email
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const userId = currentUser.id;
    console.log('💕 API GET /matches - Début');
    console.log('👤 Utilisateur:', currentUser.name, '(', userId, ')');

    // Récupérer tous les matches de l'utilisateur
    const matches = await prisma.match.findMany({
      where: {
        users: {
          some: { id: userId }
        }
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            age: true,
            photos: { 
              where: { isPrimary: true },
              take: 1 
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: { id: true, name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('🔍 Matches bruts trouvés:', matches.length);

    // Formater les matches pour le frontend
    const formattedMatches = matches.map(match => {
      // Trouver l'autre utilisateur (pas l'utilisateur actuel)
      const otherUser = match.users.find(user => user.id !== userId);
      const lastMessage = match.messages[0];
      
      if (!otherUser) {
        console.log('⚠️ Match sans autre utilisateur:', match.id);
        return null;
      }

      return {
        id: match.id,
        matchedAt: match.createdAt,
        user: {
          id: otherUser.id,
          name: otherUser.name,
          age: otherUser.age,
          photo: otherUser.photos[0]?.url || null
        },
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          sentAt: lastMessage.createdAt,
          isFromCurrentUser: lastMessage.senderId === userId,
          senderName: lastMessage.sender.name
        } : null,
        unreadCount: match.messages?.filter(
          msg => !msg.readAt && msg.senderId !== userId
        ).length || 0,
        isNewMatch: !lastMessage || match.messages.length <= 1 // Nouveau si pas de messages ou juste le message auto
      };
    }).filter(Boolean); // Enlever les matches null

    const stats = {
      totalMatches: formattedMatches.length,
      newMatches: formattedMatches.filter(m => m.isNewMatch).length,
      activeConversations: formattedMatches.filter(
        m => m.lastMessage && !m.isNewMatch
      ).length
    };

    console.log('💕 Matches formatés:', formattedMatches.length);
    console.log('📊 Stats matches:', stats);

    return NextResponse.json({
      matches: formattedMatches,
      stats,
      message: formattedMatches.length === 0 
        ? 'Aucun match pour le moment. Continuez à swiper !' 
        : `Vous avez ${formattedMatches.length} match${formattedMatches.length > 1 ? 's' : ''} !`
    });

  } catch (error) {
    console.error('❌ Erreur /api/matches:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur interne',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}