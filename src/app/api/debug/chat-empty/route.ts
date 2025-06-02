// src/app/api/debug/create-likes/route.ts
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('💕 CRÉATION des likes avec utilisateurs existants');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { prisma } = await import('@/lib/db');
    const currentUserId = session.user.id;

    console.log('👤 Création likes pour:', session.user.name, '(', currentUserId, ')');

    // 1. Récupérer tous les autres utilisateurs (sauf l'utilisateur courant)
    const existingUsers = await prisma.user.findMany({
      where: {
        id: { not: currentUserId }
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    console.log(`👥 ${existingUsers.length} autres utilisateurs trouvés dans la BDD`);

    if (existingUsers.length === 0) {
      return NextResponse.json({
        error: 'Aucun autre utilisateur trouvé',
        message: 'Il faut au moins 2 utilisateurs pour créer des likes'
      }, { status: 400 });
    }

    // 2. Prendre les 3-4 premiers utilisateurs pour créer des likes réciproques
    const usersToMatch = existingUsers.slice(0, Math.min(4, existingUsers.length));
    
    // 3. Créer des likes RÉCIPROQUES (indispensable pour les matches)
    const likesToCreate = [];
    
    for (const user of usersToMatch) {
      // Vous likez cet utilisateur
      likesToCreate.push({
        senderId: currentUserId,
        receiverId: user.id,
        userName: user.name
      });
      
      // Cet utilisateur vous like aussi (RÉCIPROQUE = MATCH!)
      likesToCreate.push({
        senderId: user.id,
        receiverId: currentUserId,
        userName: user.name
      });
    }

    // Créer les likes en base
    let likesCreated = 0;
    let likesSkipped = 0;
    const createdLikes = [];

    for (const likeData of likesToCreate) {
      try {
        const like = await prisma.like.upsert({
          where: {
            senderId_receiverId: {
              senderId: likeData.senderId,
              receiverId: likeData.receiverId
            }
          },
          update: {},
          create: {
            senderId: likeData.senderId,
            receiverId: likeData.receiverId
          }
        });
        
        likesCreated++;
        createdLikes.push({
          from: likeData.senderId === currentUserId ? 'Vous' : likeData.userName,
          to: likeData.receiverId === currentUserId ? 'Vous' : likeData.userName,
          direction: likeData.senderId === currentUserId ? '→' : '←'
        });
        
      } catch (error) {
        console.log(`⚠️ Like déjà existant: ${likeData.senderId} → ${likeData.receiverId}`);
        likesSkipped++;
      }
    }

    console.log(`✅ ${likesCreated} likes créés, ${likesSkipped} déjà existants`);

    // 4. Maintenant utiliser votre endpoint existant pour créer les matches
    console.log('🎯 Appel de votre endpoint pour créer les matches...');
    
    const matchResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/debug/likes-matches`, {
      method: 'POST',
      headers: {
        'cookie': request.headers.get('cookie') || '',
        'content-type': 'application/json'
      }
    });

    let matchResult = { matchesCreated: 0, errors: 0 };
    if (matchResponse.ok) {
      matchResult = await matchResponse.json();
      console.log(`✅ ${matchResult.matchesCreated} matches créés via votre API`);
    } else {
      const errorText = await matchResponse.text();
      console.log('❌ Erreur création matches:', errorText);
    }

    // 5. Optionnel: Créer quelques messages de démarrage
    const { createMessages } = await request.json().catch(() => ({ createMessages: true }));
    
    let messagesCreated = 0;
    if (createMessages !== false) {
      const matches = await prisma.match.findMany({
        where: {
          users: { some: { id: currentUserId } }
        },
        include: {
          users: { select: { id: true, name: true } }
        }
      });

      for (const match of matches) {
        const otherUser = match.users.find(u => u.id !== currentUserId);
        if (!otherUser) continue;

        // Un message de démarrage simple
        await prisma.message.create({
          data: {
            matchId: match.id,
            senderId: otherUser.id,
            content: `Salut ${session.user.name} ! 👋`
          }
        });
        messagesCreated++;
      }
      
      console.log(`✅ ${messagesCreated} messages de démarrage créés`);
    }

    // 6. Résumé des actions
    const summary = {
      success: true,
      usersInDB: existingUsers.length + 1, // +1 pour l'utilisateur courant
      processed: {
        targetUsers: usersToMatch.map(u => u.name),
        likesCreated,
        likesSkipped,
        matchesCreated: matchResult.matchesCreated,
        messagesCreated
      },
      likesDetails: createdLikes,
      nextSteps: [
        `Aller sur /api/debug/chat-empty pour vérifier`,
        `Rafraîchir votre page de chat`,
        `Vous devriez voir ${matchResult.matchesCreated} conversation(s)`
      ]
    };

    console.log('🎉 LIKES ET MATCHES CRÉÉS!');
    return NextResponse.json(summary);

  } catch (error: any) {
    console.error('❌ Erreur création likes:', error);
    return NextResponse.json({
      error: 'Erreur création likes',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// GET pour voir l'état actuel
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { prisma } = await import('@/lib/db');
    const currentUserId = session.user.id;

    // État actuel
    const [totalUsers, sentLikes, receivedLikes, matches] = await Promise.all([
      prisma.user.count(),
      prisma.like.count({ where: { senderId: currentUserId } }),
      prisma.like.count({ where: { receiverId: currentUserId } }),
      prisma.match.count({ where: { users: { some: { id: currentUserId } } } })
    ]);

    return NextResponse.json({
      currentUser: {
        id: currentUserId,
        name: session.user.name
      },
      stats: {
        totalUsers,
        yourSentLikes: sentLikes,
        yourReceivedLikes: receivedLikes,
        yourMatches: matches
      },
      readyToCreateLikes: totalUsers > 1,
      recommendation: sentLikes === 0 ? 'Exécuter POST /api/debug/create-likes' : 'Looks good!'
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}