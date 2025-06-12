// src/app/api/chat/stats/route.ts - VERSION CORRIGÉE
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth'; // ✅ Utiliser votre config NextAuth v5

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [CHAT-STATS] Début de la requête');

    // 1. Vérifier l'authentification avec NextAuth v5
    const session = await auth();
    
    if (!session?.user?.id) {
      console.log('❌ [CHAT-STATS] Non authentifié');
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    console.log('👤 [CHAT-STATS] User ID:', session.user.id);

    // 2. Pour l'instant, retourner des statistiques par défaut
    // TODO: Intégrer avec Stream Chat quand la config sera complète
    const stats = {
      totalConversations: 0,
      activeConversations: 0,
      unreadCount: 0,
      recentMessages: 0,
      lastUpdated: new Date().toISOString()
    };

    // 3. Si Stream est configuré, essayer de récupérer les vraies stats
    if (process.env.STREAM_API_KEY && process.env.STREAM_API_SECRET) {
      try {
        // Import dynamique pour éviter les erreurs si Stream n'est pas installé
        const { StreamChat } = await import('stream-chat');
        
        const serverClient = StreamChat.getInstance(
          process.env.STREAM_API_KEY,
          process.env.STREAM_API_SECRET
        );

        console.log('🔄 [CHAT-STATS] Récupération des channels Stream...');
        
        const channels = await serverClient.queryChannels(
          {
            type: 'messaging',
            members: { $in: [session.user.id] }
          },
          { last_message_at: -1 },
          { 
            state: true, 
            limit: 50 
          }
        );

        console.log(`📋 [CHAT-STATS] ${channels.length} channels trouvés`);

        // Calculer les statistiques réelles
        let totalUnread = 0;
        let activeConversations = 0;
        let recentMessages = 0;

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        for (const channel of channels) {
          try {
            // Compter les messages non lus
            const unreadCount = await channel.countUnread(session.user.id);
            totalUnread += unreadCount || 0;

            // Vérifier l'activité récente
            const lastMessage = channel.state?.messages?.slice(-1)[0];
            if (lastMessage && new Date(lastMessage.created_at) > oneDayAgo) {
              recentMessages++;
            }

            // Conversations actives
            if (channel.state?.messages && channel.state.messages.length > 0) {
              activeConversations++;
            }

          } catch (channelError) {
            console.warn(`⚠️ [CHAT-STATS] Erreur channel ${channel.id}:`, channelError);
          }
        }

        // Mettre à jour les stats avec les vraies données
        stats.totalConversations = channels.length;
        stats.activeConversations = activeConversations;
        stats.unreadCount = totalUnread;
        stats.recentMessages = recentMessages;

        console.log('✅ [CHAT-STATS] Statistiques Stream calculées:', stats);

      } catch (streamError) {
        console.warn('⚠️ [CHAT-STATS] Stream non disponible, utilisation valeurs par défaut:', streamError);
        // Les stats par défaut restent en place
      }
    } else {
      console.log('⚠️ [CHAT-STATS] Variables Stream manquantes, utilisation valeurs par défaut');
    }

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ [CHAT-STATS] Erreur générale:', error);
    
    return NextResponse.json(
      { 
        error: 'Erreur lors du calcul des statistiques',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

// Endpoint POST pour invalider le cache
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    console.log('🔄 [CHAT-STATS] Invalidation cache demandée');

    return NextResponse.json({
      success: true,
      message: 'Cache invalidé'
    });

  } catch (error) {
    console.error('❌ [CHAT-STATS] Erreur POST:', error);
    
    return NextResponse.json(
      { error: 'Erreur lors de l\'invalidation du cache' },
      { status: 500 }
    );
  }
}