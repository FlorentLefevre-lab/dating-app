// src/app/api/matches/route.ts - STRUCTURE CORRIGÉE POUR TA DB
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🔍 API Matches GET appelée');
  
  try {
    // 1. Authentification
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log('❌ Utilisateur non authentifié');
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    console.log('✅ Utilisateur authentifié:', session.user.id);

    // 2. Import Prisma
    const { prisma } = await import('@/lib/db');
    console.log('✅ Prisma importé');

    // 3. Requête matches avec la VRAIE structure (many-to-many users)
    console.log('🔍 Recherche matches pour user:', session.user.id);
    
    const matches = await prisma.match.findMany({
      where: {
        users: {
          some: {
            id: session.user.id  // L'utilisateur fait partie des users du match
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
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    console.log(`✅ ${matches.length} matches trouvés`);

    // 4. Transformation pour le frontend
    const formattedMatches = await Promise.all(
      matches.map(async (match) => {
        // Filtrer pour récupérer l'autre utilisateur (pas l'utilisateur actuel)
        const otherUsers = match.users.filter(user => user.id !== session.user.id);
        const currentUser = match.users.find(user => user.id === session.user.id);
        
        // Pour un match 1-on-1, il devrait y avoir exactement 2 users
        const otherUser = otherUsers[0];
        
        if (!otherUser) {
          console.warn('⚠️ Match sans autre utilisateur:', match.id);
          return null; // Skip ce match invalide
        }

        // Compter les messages non lus pour ce match
        let unreadCount = 0;
        try {
          unreadCount = await prisma.message.count({
            where: {
              matchId: match.id,
              senderId: { not: session.user.id },
              readAt: null
            }
          });
        } catch (countError) {
          console.warn('⚠️ Erreur comptage messages non lus:', countError);
        }

        // Formater le dernier message
        let lastMessage = undefined;
        if (match.messages && match.messages[0]) {
          const msg = match.messages[0];
          lastMessage = {
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
          };
        }

        return {
          id: match.id,
          users: [currentUser, otherUser].filter(Boolean), // L'utilisateur actuel et l'autre
          lastMessage,
          unreadCount,
          createdAt: match.createdAt.toISOString()
        };
      })
    );

    // Filtrer les matches null (invalides)
    const validMatches = formattedMatches.filter(match => match !== null);

    console.log('✅ Matches formatés avec succès');

    return NextResponse.json({ 
      matches: validMatches,
      debug: {
        userId: session.user.id,
        totalFound: matches.length,
        validMatches: validMatches.length,
        structure: 'many-to-many users relation',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Erreur API matches:', error);
    console.error('❌ Stack trace:', error.stack);
    
    return NextResponse.json({ 
      error: 'Erreur serveur',
      message: error.message,
      userId: session?.user?.id || 'unknown'
    }, { status: 500 });
  }
}