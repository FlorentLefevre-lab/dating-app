// src/app/api/debug/likes-matches/route.ts - DIAGNOSTIC PRIORITAIRE
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🔍 DIAGNOSTIC: Vérification likes et matches');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { prisma } = await import('@/lib/db');
    const userId = session.user.id;

    console.log('👤 Utilisateur analysé:', session.user.name, '(', userId, ')');

    // 1. Likes envoyés par cet utilisateur
    const sentLikes = await prisma.like.findMany({
      where: { senderId: userId },
      include: {
        receiver: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Likes reçus par cet utilisateur
    const receivedLikes = await prisma.like.findMany({
      where: { receiverId: userId },
      include: {
        sender: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📤 Likes envoyés: ${sentLikes.length}`);
    console.log(`📥 Likes reçus: ${receivedLikes.length}`);

    // 3. Identifier les likes RÉCIPROQUES (= matches potentiels)
    const reciprocalMatches = [];
    
    for (const sentLike of sentLikes) {
      const reciprocal = receivedLikes.find(
        receivedLike => receivedLike.senderId === sentLike.receiverId
      );
      
      if (reciprocal) {
        reciprocalMatches.push({
          otherUserId: sentLike.receiverId,
          otherUser: sentLike.receiver,
          sentAt: sentLike.createdAt,
          receivedAt: reciprocal.createdAt,
          status: 'RECIPROCAL_LIKE_FOUND'
        });
      }
    }

    console.log(`💕 Likes réciproques trouvés: ${reciprocalMatches.length}`);

    // 4. Matches officiels existants
    const existingMatches = await prisma.match.findMany({
      where: {
        users: {
          some: { id: userId }
        }
      },
      include: {
        users: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    console.log(`🎯 Matches officiels existants: ${existingMatches.length}`);

    // 5. Identifier les matches MANQUANTS
    const missingMatches = [];
    
    for (const reciprocal of reciprocalMatches) {
      const hasOfficialMatch = existingMatches.some(match => 
        match.users.some(user => user.id === reciprocal.otherUserId)
      );
      
      if (!hasOfficialMatch) {
        missingMatches.push({
          otherUserId: reciprocal.otherUserId,
          otherUser: reciprocal.otherUser,
          sentAt: reciprocal.sentAt,
          receivedAt: reciprocal.receivedAt,
          status: 'MATCH_MISSING',
          action: 'NEEDS_MATCH_CREATION'
        });
      }
    }

    console.log(`❌ Matches manquants: ${missingMatches.length}`);

    // 6. Récapitulatif détaillé
    const report = {
      user: {
        id: userId,
        name: session.user.name,
        email: session.user.email
      },
      stats: {
        sentLikes: sentLikes.length,
        receivedLikes: receivedLikes.length,
        reciprocalLikes: reciprocalMatches.length,
        existingMatches: existingMatches.length,
        missingMatches: missingMatches.length
      },
      details: {
        sentLikes: sentLikes.map(like => ({
          to: like.receiver.name,
          toEmail: like.receiver.email,
          toId: like.receiver.id,
          sentAt: like.createdAt.toISOString()
        })),
        receivedLikes: receivedLikes.map(like => ({
          from: like.sender.name,
          fromEmail: like.sender.email,
          fromId: like.sender.id,
          receivedAt: like.createdAt.toISOString()
        })),
        reciprocalLikes: reciprocalMatches.map(r => ({
          user: r.otherUser.name,
          userEmail: r.otherUser.email,
          userId: r.otherUser.id,
          sentAt: r.sentAt.toISOString(),
          receivedAt: r.receivedAt.toISOString(),
          status: 'SHOULD_BE_MATCH'
        })),
        existingMatches: existingMatches.map(match => ({
          id: match.id,
          users: match.users.map(u => ({ name: u.name, email: u.email, id: u.id })),
          createdAt: match.createdAt.toISOString()
        })),
        missingMatches: missingMatches.map(missing => ({
          user: missing.otherUser.name,
          userEmail: missing.otherUser.email,
          userId: missing.otherUser.id,
          sentAt: missing.sentAt.toISOString(),
          receivedAt: missing.receivedAt.toISOString(),
          status: 'MISSING_MATCH',
          urgency: 'HIGH'
        }))
      },
      recommendations: [
        missingMatches.length > 0 ? `Créer ${missingMatches.length} match(es) manquant(s)` : 'Aucun match manquant',
        reciprocalMatches.length === 0 ? 'Aucun like réciproque trouvé' : `${reciprocalMatches.length} like(s) réciproque(s) détecté(s)`,
        existingMatches.length === 0 ? 'Aucun match existant - problème possible' : `${existingMatches.length} match(es) existant(s)`
      ],
      nextAction: missingMatches.length > 0 ? 'POST sur cette même URL pour créer les matches automatiquement' : 'Aucune action nécessaire'
    };

    return NextResponse.json(report);

  } catch (error: any) {
    console.error('❌ Erreur diagnostic likes-matches:', error);
    return NextResponse.json({
      error: 'Erreur diagnostic',
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

// POST pour créer automatiquement les matches manquants
export async function POST(request: NextRequest) {
  console.log('🔄 CRÉATION AUTOMATIQUE des matches manquants');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { prisma } = await import('@/lib/db');
    const userId = session.user.id;

    console.log('👤 Création matches pour:', session.user.name);

    // Répéter la même logique de détection
    const sentLikes = await prisma.like.findMany({
      where: { senderId: userId },
      include: { receiver: { select: { id: true, name: true } } }
    });

    const receivedLikes = await prisma.like.findMany({
      where: { receiverId: userId },
      include: { sender: { select: { id: true, name: true } } }
    });

    const reciprocalLikes = [];
    for (const sentLike of sentLikes) {
      const reciprocal = receivedLikes.find(
        receivedLike => receivedLike.senderId === sentLike.receiverId
      );
      if (reciprocal) {
        reciprocalLikes.push({
          otherUserId: sentLike.receiverId,
          otherUser: sentLike.receiver
        });
      }
    }

    const existingMatches = await prisma.match.findMany({
      where: { users: { some: { id: userId } } },
      include: { users: { select: { id: true } } }
    });

    const missingMatches = reciprocalLikes.filter(reciprocal => {
      return !existingMatches.some(match => 
        match.users.some(user => user.id === reciprocal.otherUserId)
      );
    });

    console.log(`🎯 ${missingMatches.length} match(es) à créer`);

    const createdMatches = [];
    const errors = [];

    for (const missing of missingMatches) {
      try {
        console.log(`🔄 Création match entre ${session.user.name} et ${missing.otherUser.name}...`);
        
        const match = await prisma.match.create({
          data: {
            users: {
              connect: [
                { id: userId },
                { id: missing.otherUserId }
              ]
            }
          },
          include: {
            users: {
              select: { id: true, name: true, email: true }
            }
          }
        });

        createdMatches.push({
          id: match.id,
          users: match.users,
          createdAt: match.createdAt.toISOString()
        });

        console.log(`✅ Match créé: ${match.id}`);

        // Créer un message de bienvenue automatique
        try {
          await prisma.message.create({
            data: {
              content: `🎉 Nouveau match ! Dites bonjour !`,
              senderId: userId,
              receiverId: missing.otherUserId,
              matchId: match.id
            }
          });
          console.log(`✅ Message de bienvenue créé pour match ${match.id}`);
        } catch (msgError) {
          console.warn(`⚠️ Erreur création message bienvenue:`, msgError);
        }

      } catch (matchError: any) {
        console.error(`❌ Erreur création match avec ${missing.otherUser.name}:`, matchError);
        errors.push({
          otherUser: missing.otherUser.name,
          otherUserId: missing.otherUserId,
          error: matchError.message
        });
      }
    }

    const result = {
      success: true,
      summary: {
        totalNeeded: missingMatches.length,
        created: createdMatches.length,
        errors: errors.length
      },
      createdMatches: createdMatches.map(match => ({
        id: match.id,
        users: match.users.map(u => u.name),
        userEmails: match.users.map(u => u.email),
        createdAt: match.createdAt
      })),
      errors: errors,
      message: `${createdMatches.length} match(es) créé(s) avec succès !`,
      nextSteps: [
        'Testez http://localhost:3000/api/matches pour voir les nouveaux matches',
        'Connectez-vous avec les 2 comptes sur 2 navigateurs différents',
        'Testez le chat en temps réel !'
      ]
    };

    console.log(`🎉 RÉSULTAT: ${createdMatches.length} matches créés, ${errors.length} erreurs`);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('❌ Erreur création matches automatiques:', error);
    return NextResponse.json({
      error: 'Erreur création matches',
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}