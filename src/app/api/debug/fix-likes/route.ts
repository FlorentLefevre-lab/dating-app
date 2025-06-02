// src/app/api/debug/fix-likes/route.ts
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('🔧 FIX: Création forcée des likes');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { prisma } = await import('@/lib/db');
    const currentUserId = session.user.id;

    console.log('👤 FIXING likes pour:', session.user.name, 'ID:', currentUserId);

    // 1. Vérifier que l'utilisateur existe bien
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { id: true, name: true, email: true }
    });

    if (!currentUser) {
      return NextResponse.json({
        error: 'Utilisateur courant introuvable',
        searchedId: currentUserId
      }, { status: 404 });
    }

    console.log('✅ Utilisateur courant trouvé:', currentUser);

    // 2. Récupérer d'autres utilisateurs (avec debug)
    const otherUsers = await prisma.user.findMany({
      where: {
        id: { not: currentUserId }
      },
      select: {
        id: true,
        name: true,
        email: true
      },
      take: 4
    });

    console.log(`👥 ${otherUsers.length} autres utilisateurs trouvés:`, otherUsers.map(u => `${u.name} (${u.id})`));

    if (otherUsers.length === 0) {
      return NextResponse.json({
        error: 'Aucun autre utilisateur trouvé',
        currentUserId
      }, { status: 400 });
    }

    // 3. Créer les likes UN PAR UN avec debug détaillé
    const results = [];
    
    for (const targetUser of otherUsers) {
      console.log(`\n🎯 Traitement utilisateur: ${targetUser.name} (${targetUser.id})`);
      
      // Like 1: Vous → TargetUser
      try {
        console.log(`  📤 Création like: ${currentUser.name} → ${targetUser.name}`);
        
        const like1 = await prisma.like.create({
          data: {
            senderId: currentUserId,
            receiverId: targetUser.id
          }
        });
        
        console.log(`  ✅ Like créé: ${like1.id}`);
        results.push({
          type: 'sent',
          from: currentUser.name,
          to: targetUser.name,
          likeId: like1.id,
          status: 'created'
        });
        
      } catch (error: any) {
        console.log(`  ❌ Erreur like envoyé:`, error.message);
        results.push({
          type: 'sent',
          from: currentUser.name,
          to: targetUser.name,
          status: 'error',
          error: error.message
        });
      }
      
      // Like 2: TargetUser → Vous
      try {
        console.log(`  📥 Création like: ${targetUser.name} → ${currentUser.name}`);
        
        const like2 = await prisma.like.create({
          data: {
            senderId: targetUser.id,
            receiverId: currentUserId
          }
        });
        
        console.log(`  ✅ Like créé: ${like2.id}`);
        results.push({
          type: 'received',
          from: targetUser.name,
          to: currentUser.name,
          likeId: like2.id,
          status: 'created'
        });
        
      } catch (error: any) {
        console.log(`  ❌ Erreur like reçu:`, error.message);
        results.push({
          type: 'received',
          from: targetUser.name,
          to: currentUser.name,
          status: 'error',
          error: error.message
        });
      }
    }

    // 4. Vérification finale
    const finalCheck = await Promise.all([
      prisma.like.count({ where: { senderId: currentUserId } }),
      prisma.like.count({ where: { receiverId: currentUserId } })
    ]);

    console.log(`\n📊 Vérification finale:`);
    console.log(`   Likes envoyés: ${finalCheck[0]}`);
    console.log(`   Likes reçus: ${finalCheck[1]}`);

    // 5. Maintenant créer les matches
    console.log('\n🎯 Création des matches...');
    
    const matchResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/debug/likes-matches`, {
      method: 'POST',
      headers: {
        'cookie': request.headers.get('cookie') || ''
      }
    });

    let matchResult = null;
    if (matchResponse.ok) {
      matchResult = await matchResponse.json();
      console.log('✅ Matches créés:', matchResult.summary);
    } else {
      console.log('❌ Erreur matches:', await matchResponse.text());
    }

    return NextResponse.json({
      success: true,
      debug: {
        currentUser,
        targetUsers: otherUsers,
        totalAttempts: results.length,
        successful: results.filter(r => r.status === 'created').length,
        errors: results.filter(r => r.status === 'error').length
      },
      results,
      finalCounts: {
        sentLikes: finalCheck[0],
        receivedLikes: finalCheck[1]
      },
      matchCreation: matchResult,
      nextStep: 'Tester GET /api/debug/likes-matches pour voir le résultat'
    });

  } catch (error: any) {
    console.error('❌ Erreur fix likes:', error);
    return NextResponse.json({
      error: 'Erreur fix likes',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}