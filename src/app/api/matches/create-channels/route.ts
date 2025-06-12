// src/app/api/matches/create-channels/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createStreamClient } from '@/lib/streamConfig';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [CREATE-CHANNELS] Début de la requête');

    // 1. Vérifier l'authentification
    const session = await auth();
    
    if (!session?.user?.id) {
      console.log('❌ [CREATE-CHANNELS] Non authentifié');
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    console.log('👤 [CREATE-CHANNELS] User:', session.user.name);

    // 2. Récupérer les matches depuis la DB
    const { prisma } = await import('@/lib/db');
    
    console.log('🔄 [CREATE-CHANNELS] Récupération des matches...');
    const matchesData = await prisma.$queryRaw<Array<{senderId: string, receiverId: string}>>`
      SELECT DISTINCT l1."senderId", l1."receiverId"
      FROM "likes" l1
      INNER JOIN "likes" l2 ON l1."senderId" = l2."receiverId" AND l1."receiverId" = l2."senderId"
      WHERE l1."receiverId" = ${session.user.id}
    `;

    console.log(`📊 [CREATE-CHANNELS] ${matchesData.length} matches trouvés`);

    if (matchesData.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Aucun match trouvé',
        channelsCreated: 0,
        totalMatches: 0,
        results: []
      });
    }

    // 3. Récupérer les détails des utilisateurs matchés
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

    console.log(`👥 [CREATE-CHANNELS] ${matchedUsers.length} utilisateurs à traiter`);

    // 4. Créer le client Stream côté serveur (avec privilèges admin)
    const client = await createStreamClient();

    let channelsCreated = 0;
    let channelsExisted = 0;
    const results = [];

    // 5. Traiter chaque utilisateur
    for (const user of matchedUsers) {
      try {
        console.log(`🔄 [CREATE-CHANNELS] Traitement: ${user.name}`);

        // 5a. Créer/Upsert l'utilisateur dans Stream
        await client.upsertUser({
          id: user.id,
          name: user.name || 'Utilisateur',
          image: user.image || '/default-avatar.png',
          email: user.email,
          role: 'user'
        });

        console.log(`✅ [CREATE-CHANNELS] Utilisateur upsert: ${user.name}`);

        // 5b. Créer le channel avec un ID prévisible
        const channelId = `match_${[session.user.id, user.id].sort().join('_')}`;
        
        console.log(`📺 [CREATE-CHANNELS] Channel ID: ${channelId}`);

        // Vérifier si le channel existe déjà
        try {
          const existingChannel = client.channel('messaging', channelId);
          const channelState = await existingChannel.query();
          
          if (channelState.channel) {
            console.log(`✅ [CREATE-CHANNELS] Channel existe déjà: ${user.name}`);
            channelsExisted++;
            results.push({ 
              userId: user.id, 
              userName: user.name, 
              channelId, 
              status: 'existed' 
            });
            continue;
          }
        } catch (existsError) {
          // Channel n'existe pas, on va le créer
          console.log(`🔄 [CREATE-CHANNELS] Channel inexistant, création: ${user.name}`);
        }

        // 5c. Créer le channel côté serveur
        const channel = client.channel('messaging', channelId, {
          name: user.name || 'Conversation',
          image: user.image,
          members: [session.user.id, user.id],
          // Métadonnées utiles
          match_user_id: user.id,
          match_user_name: user.name,
          created_by_server: true
        });

        // Créer le channel avec l'utilisateur actuel comme créateur
        await channel.create(session.user.id);
        
        channelsCreated++;
        results.push({ 
          userId: user.id, 
          userName: user.name, 
          channelId, 
          status: 'created' 
        });

        console.log(`✅ [CREATE-CHANNELS] Channel créé: ${user.name}`);

      } catch (error) {
        console.error(`❌ [CREATE-CHANNELS] Erreur ${user.name}:`, error);
        
        results.push({ 
          userId: user.id, 
          userName: user.name, 
          status: 'failed',
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
      }

      // Petite pause pour éviter de surcharger Stream
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`🎯 [CREATE-CHANNELS] Résumé: ${channelsCreated} créés, ${channelsExisted} existaient`);

    return NextResponse.json({
      success: true,
      channelsCreated,
      channelsExisted,
      totalMatches: matchedUsers.length,
      results,
      summary: {
        created: channelsCreated,
        existed: channelsExisted,
        failed: results.filter(r => r.status === 'failed').length
      }
    });

  } catch (error) {
    console.error('❌ [CREATE-CHANNELS] Erreur générale:', error);
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la création des channels',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

// GET pour vérifier l'état
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Vérifier les channels existants côté Stream
    const client = await createStreamClient();
    
    const channels = await client.queryChannels(
      {
        type: 'messaging',
        members: { $in: [session.user.id] }
      },
      { last_message_at: -1 },
      { limit: 50 }
    );

    return NextResponse.json({
      success: true,
      channelsCount: channels.length,
      channels: channels.map(channel => ({
        id: channel.id,
        name: channel.data?.name,
        members: Object.keys(channel.state?.members || {}),
        messageCount: channel.state?.messages?.length || 0
      }))
    });

  } catch (error) {
    console.error('❌ [CREATE-CHANNELS] Erreur GET:', error);
    
    return NextResponse.json(
      { error: 'Erreur de vérification' },
      { status: 500 }
    );
  }
}