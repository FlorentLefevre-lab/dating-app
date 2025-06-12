// src/app/api/stream/token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createStreamClient, createUserToken, upsertStreamUser } from '@/lib/streamConfig';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [STREAM] Début de la requête token');

    // 1. Vérifier l'authentification
    const session = await auth();
    
    if (!session?.user?.id) {
      console.log('❌ [STREAM] Non authentifié');
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    console.log('👤 [STREAM] Session: OK');
    console.log('📝 [STREAM] User ID reçu:', session.user.id);

    // 2. Récupérer les données du body (optionnel pour otherUser)
    let otherUserId = null;
    try {
      const body = await request.json();
      otherUserId = body.otherUserId;
      console.log('👥 [STREAM] Other User ID:', otherUserId || 'AUCUN');
    } catch {
      // Pas de body, c'est OK
    }

    // 3. Créer l'objet utilisateur pour Stream
    const streamUser = {
      id: session.user.id,
      name: session.user.name || 'Utilisateur',
      image: session.user.image || '/default-avatar.png',
      email: session.user.email,
      role: 'user'
    };

    console.log('👤 [STREAM] Objet utilisateur créé:', streamUser);

    // 4. Upsert l'utilisateur dans Stream (créer ou mettre à jour)
    console.log('🔄 [STREAM] Tentative upsert...');
    await upsertStreamUser(streamUser);
    console.log('✅ [STREAM] Upsert réussi');

    // 5. 🆕 NOUVEAU : Créer automatiquement tous les utilisateurs des matches
    console.log('🔄 [STREAM] Création des utilisateurs des matches...');
    
    try {
      // Récupérer les matches de l'utilisateur
      const { prisma } = await import('@/lib/db');
      
      const matchesData = await prisma.$queryRaw<Array<{senderId: string, receiverId: string}>>`
        SELECT DISTINCT l1."senderId", l1."receiverId"
        FROM "likes" l1
        INNER JOIN "likes" l2 ON l1."senderId" = l2."receiverId" AND l1."receiverId" = l2."senderId"
        WHERE l1."receiverId" = ${session.user.id}
      `;

      console.log(`📋 [STREAM] ${matchesData.length} matches trouvés pour création utilisateurs`);

      if (matchesData.length > 0) {
        // Récupérer les détails des utilisateurs matchés
        const matchedUserIds = matchesData.map(match => match.senderId);
        
        const matchedUsers = await prisma.user.findMany({
          where: {
            id: { in: matchedUserIds }
          },
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        });

        console.log(`👥 [STREAM] ${matchedUsers.length} utilisateurs à créer dans Stream`);

        // Créer chaque utilisateur dans Stream (côté serveur = autorisé)
        const client = await createStreamClient();
        
        for (const user of matchedUsers) {
          try {
            const matchStreamUser = {
              id: user.id,
              name: user.name || 'Utilisateur',
              image: user.image || '/default-avatar.png',
              email: user.email,
              role: 'user'
            };

            await client.upsertUser(matchStreamUser);
            console.log(`✅ [STREAM] Utilisateur match créé: ${user.name} (${user.id})`);

          } catch (userError) {
            console.warn(`⚠️ [STREAM] Erreur création utilisateur ${user.name}:`, userError);
            // Ne pas fail pour un utilisateur, continuer avec les autres
          }
        }

        console.log('✅ [STREAM] Création des utilisateurs matches terminée');
      }

    } catch (matchError) {
      console.warn('⚠️ [STREAM] Erreur lors de la création des utilisateurs matches:', matchError);
      // Ne pas fail pour ça, le token principal doit être créé
    }

    // 6. Si otherUserId est fourni, upsert l'autre utilisateur aussi
    if (otherUserId) {
      try {
        // Récupérer les infos de l'autre utilisateur depuis la DB
        const { prisma } = await import('@/lib/db');
        
        const otherUser = await prisma.user.findUnique({
          where: { id: otherUserId },
          select: {
            id: true,
            name: true,
            image: true,
            email: true
          }
        });

        if (otherUser) {
          const otherStreamUser = {
            id: otherUser.id,
            name: otherUser.name || 'Utilisateur',
            image: otherUser.image || '/default-avatar.png',
            email: otherUser.email,
            role: 'user'
          };

          console.log('👥 [STREAM] Upsert other user:', otherStreamUser.name);
          await upsertStreamUser(otherStreamUser);
          console.log('✅ [STREAM] Other user upsert réussi');
        }
      } catch (otherUserError) {
        console.warn('⚠️ [STREAM] Erreur upsert other user:', otherUserError);
        // Ne pas fail pour ça, continuer
      }
    }

    // 7. Générer le token
    console.log('🔄 [STREAM] Génération token...');
    const token = await createUserToken(session.user.id);
    console.log('✅ [STREAM] Token généré');

    return NextResponse.json({
      success: true,
      token,
      user: streamUser,
      matchUsersCreated: true
    });

  } catch (error) {
    console.error('❌ [STREAM] Erreur générale:', error);
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la génération du token',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

// GET pour tester la configuration
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Juste vérifier que Stream est configuré
    const { getStreamConfig } = await import('@/lib/streamConfig');
    const config = getStreamConfig();

    return NextResponse.json({
      success: true,
      configured: config.isConfigured,
      missingVars: config.missingVars,
      userId: session.user.id
    });

  } catch (error) {
    console.error('❌ [STREAM] Erreur GET:', error);
    
    return NextResponse.json(
      { error: 'Erreur de configuration' },
      { status: 500 }
    );
  }
}