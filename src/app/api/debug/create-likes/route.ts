// src/app/api/debug/likes-state/route.ts
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🔍 ANALYSE DÉTAILLÉE des likes et matches');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { prisma } = await import('@/lib/db');
    const currentUserId = session.user.id;

    console.log('👤 Analyse pour:', session.user.name, '(', currentUserId, ')');

    // 1. Tous les likes impliquant l'utilisateur actuel
    const [sentLikes, receivedLikes] = await Promise.all([
      prisma.like.findMany({
        where: { senderId: currentUserId },
        include: {
          receiver: { select: { id: true, name: true, email: true } }
        }
      }),
      prisma.like.findMany({
        where: { receiverId: currentUserId },
        include: {
          sender: { select: { id: true, name: true, email: true } }
        }
      })
    ]);

    console.log(`💕 Likes envoyés: ${sentLikes.length}`);
    console.log(`💕 Likes reçus: ${receivedLikes.length}`);

    // 2. Identifier les likes RÉCIPROQUES (qui devraient devenir des matches)
    const reciprocalLikes = [];
    
    for (const sentLike of sentLikes) {
      const isReciprocal = receivedLikes.some(
        received => received.senderId === sentLike.receiverId
      );
      
      if (isReciprocal) {
        reciprocalLikes.push({
          user1: currentUserId,
          user2: sentLike.receiverId,
          user2Name: sentLike.receiver.name,
          bothWays: true
        });
      }
    }

    console.log(`🎯 Likes réciproques trouvés: ${reciprocalLikes.length}`);

    // 3. Matches actuels en base
    const existingMatches = await prisma.match.findMany({
      where: {
        users: { some: { id: currentUserId } }
      },
      include: {
        users: { select: { id: true, name: true } },
        messages: { select: { id: true } }
      }
    });

    console.log(`🎯 Matches en base: ${existingMatches.length}`);

    // 4. Identifier les matches MANQUANTS
    const missingMatches = [];
    
    for (const reciprocal of reciprocalLikes) {
      const matchExists = existingMatches.some(match => 
        match.users.some(u => u.id === reciprocal.user2)
      );
      
      if (!matchExists) {
        missingMatches.push({
          user1: currentUserId,
          user2: reciprocal.user2,
          user2Name: reciprocal.user2Name
        });
      }
    }

    // 5. Diagnostic complet
    const diagnosis = {
      user: {
        id: currentUserId,
        name: session.user.name
      },
      
      likes: {
        sent: sentLikes.map(l => ({
          to: l.receiver.name,
          toId: l.receiverId,
          createdAt: l.createdAt
        })),
        received: receivedLikes.map(l => ({
          from: l.sender.name,
          fromId: l.senderId,
          createdAt: l.createdAt
        })),
        reciprocal: reciprocalLikes
      },
      
      matches: {
        existing: existingMatches.map(m => ({
          id: m.id,
          users: m.users.map(u => u.name),
          messageCount: m.messages.length,
          createdAt: m.createdAt
        })),
        missing: missingMatches
      },
      
      summary: {
        likesCount: sentLikes.length + receivedLikes.length,
        reciprocalCount: reciprocalLikes.length,
        existingMatchesCount: existingMatches.length,
        missingMatchesCount: missingMatches.length
      },
      
      diagnosis: {
        hasLikes: sentLikes.length > 0 || receivedLikes.length > 0,
        hasReciprocalLikes: reciprocalLikes.length > 0,
        hasMatches: existingMatches.length > 0,
        hasMissingMatches: missingMatches.length > 0,
        chatShouldWork: existingMatches.length > 0
      },
      
      recommendations: []
    };

    // Recommandations basées sur l'état
    if (!diagnosis.diagnosis.hasLikes) {
      diagnosis.recommendations.push('❌ Créer des likes avec POST /api/debug/create-likes');
    }
    
    if (diagnosis.diagnosis.hasReciprocalLikes && diagnosis.diagnosis.hasMissingMatches) {
      diagnosis.recommendations.push(`⚠️ ${missingMatches.length} matches manquants ! Problème avec votre endpoint /api/debug/likes-matches`);
      diagnosis.recommendations.push('🔧 Vérifier la logique de création des matches');
    }
    
    if (diagnosis.diagnosis.hasMatches && existingMatches.every(m => m.messages.length === 0)) {
      diagnosis.recommendations.push('💬 Matches existent mais aucun message - ajouter des messages de test');
    }
    
    if (diagnosis.diagnosis.chatShouldWork) {
      diagnosis.recommendations.push('✅ Le chat devrait fonctionner - vérifier le frontend');
    }

    console.log('🎯 Analyse terminée');
    return NextResponse.json(diagnosis);

  } catch (error: any) {
    console.error('❌ Erreur analyse likes/matches:', error);
    return NextResponse.json({
      error: 'Erreur analyse',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}