// src/hooks/useDatingChat.ts - Version corrigée avec useQuery
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { StreamChat, Channel } from 'stream-chat';
import { useQuery } from './useQuery';

interface Match {
  id: string;
  userId: string;
  userName: string;
  userImage?: string;
  matchedAt: Date;
  channelId?: string;
}

interface UseDatingChatReturn {
  // État
  isConnected: boolean;
  matches: Match[];
  activeChannels: Channel[];
  unreadCount: number;
  
  // Actions
  createConversationWithMatch: (matchId: string) => Promise<Channel | null>;
  getOrCreateChannel: (otherUserId: string) => Promise<Channel | null>;
  markChannelAsRead: (channelId: string) => Promise<void>;
  getUnreadMessagesCount: () => number;
  refreshMatches: () => Promise<void>;
  
  // État de chargement
  loading: boolean;
  error: string | null;
}

export function useDatingChat(client: StreamChat | null): UseDatingChatReturn {
  const { data: session } = useSession();
  
  // ✅ Utiliser useQuery pour les matches (remplace le fetch manuel)
  const { 
    data: matches, 
    isLoading: matchesLoading, 
    error: matchesError,
    refresh: refreshMatches 
  } = useQuery<Match[]>('/api/matches', {
    cache: true,
    cacheTtl: 2 * 60 * 1000, // 2 minutes
    enabled: !!session?.user?.id
  });

  // États pour Stream uniquement
  const [isConnected, setIsConnected] = useState(false);
  const [activeChannels, setActiveChannels] = useState<Channel[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [channelsError, setChannelsError] = useState<string | null>(null);

  // Surveiller l'état de connexion Stream
  useEffect(() => {
    if (!client) {
      setIsConnected(false);
      return;
    }

    const handleConnection = () => setIsConnected(true);
    const handleDisconnection = () => setIsConnected(false);

    client.on('connection.changed', (event) => {
      setIsConnected(event.online);
    });

    // Vérifier l'état initial
    setIsConnected(client.wsConnection?.isConnecting === false);

    return () => {
      client.off('connection.changed', handleConnection);
      client.off('connection.changed', handleDisconnection);
    };
  }, [client]);

  // ✅ Charger les channels actifs (logique Stream conservée)
  const loadActiveChannels = useCallback(async () => {
    if (!client || !session?.user?.id) return;

    try {
      setChannelsError(null);
      
      const channels = await client.queryChannels(
        {
          type: 'messaging',
          members: { $in: [session.user.id] }
        },
        { last_message_at: -1 },
        { state: true, presence: true, limit: 20 }
      );

      setActiveChannels(channels);
      
      // Calculer le nombre de messages non lus
      const totalUnread = channels.reduce((total, channel) => {
        return total + (channel.countUnread() || 0);
      }, 0);
      
      setUnreadCount(totalUnread);

    } catch (err) {
      console.error('Erreur chargement channels:', err);
      setChannelsError('Impossible de charger les conversations');
    }
  }, [client, session?.user?.id]);

  // ✅ Créer une conversation avec un match
  const createConversationWithMatch = useCallback(async (matchId: string): Promise<Channel | null> => {
    if (!client || !session?.user?.id || !matches) return null;

    try {
      const match = matches.find(m => m.id === matchId);
      if (!match) throw new Error('Match introuvable');

      const channelId = `match-${session.user.id}-${match.userId}`;
      
      const channel = client.channel('messaging', channelId, {
        members: [session.user.id, match.userId],
        name: `${session.user.name} & ${match.userName}`,
        match_id: matchId,
        created_by_match: true
      });

      await channel.create();
      
      // ✅ Plus besoin de setMatches - useQuery gère l'état
      // Les matches sont maintenant en lecture seule depuis l'API
      
      return channel;
      
    } catch (err) {
      console.error('Erreur création conversation:', err);
      setChannelsError('Impossible de créer la conversation');
      return null;
    }
  }, [client, session?.user?.id, matches]);

  // ✅ Obtenir ou créer un channel avec un utilisateur
  const getOrCreateChannel = useCallback(async (otherUserId: string): Promise<Channel | null> => {
    if (!client || !session?.user?.id) return null;

    try {
      setChannelsError(null);
      
      // Vérifier si un channel existe déjà
      const existingChannels = await client.queryChannels(
        {
          type: 'messaging',
          members: { $eq: [session.user.id, otherUserId] }
        }
      );

      if (existingChannels.length > 0) {
        return existingChannels[0];
      }

      // Créer un nouveau channel
      const channelId = `private-${[session.user.id, otherUserId].sort().join('-')}`;
      
      const channel = client.channel('messaging', channelId, {
        members: [session.user.id, otherUserId]
      });

      await channel.create();
      return channel;

    } catch (err) {
      console.error('Erreur get/create channel:', err);
      setChannelsError('Impossible d\'accéder à la conversation');
      return null;
    }
  }, [client, session?.user?.id]);

  // ✅ Marquer un channel comme lu
  const markChannelAsRead = useCallback(async (channelId: string) => {
    if (!client) return;

    try {
      const channel = client.channel('messaging', channelId);
      await channel.markRead();
      
      // Recalculer le nombre non lu
      loadActiveChannels();
      
    } catch (err) {
      console.error('Erreur mark as read:', err);
    }
  }, [client, loadActiveChannels]);

  // ✅ Obtenir le nombre total de messages non lus
  const getUnreadMessagesCount = useCallback(() => {
    return activeChannels.reduce((total, channel) => {
      return total + (channel.countUnread() || 0);
    }, 0);
  }, [activeChannels]);

  // ✅ Charger les données au montage (matches automatiques via useQuery)
  useEffect(() => {
    if (isConnected && session?.user?.id) {
      // Plus besoin de loadMatches() - useQuery le fait automatiquement
      loadActiveChannels();
    }
  }, [isConnected, session?.user?.id, loadActiveChannels]);

  // ✅ Écouter les nouveaux messages pour mettre à jour le compteur
  useEffect(() => {
    if (!client) return;

    const handleNewMessage = () => {
      loadActiveChannels();
    };

    client.on('message.new', handleNewMessage);
    client.on('message.read', handleNewMessage);

    return () => {
      client.off('message.new', handleNewMessage);
      client.off('message.read', handleNewMessage);
    };
  }, [client, loadActiveChannels]);

  return {
    isConnected,
    matches: matches || [],           // ✅ Directement depuis useQuery
    activeChannels,
    unreadCount,
    createConversationWithMatch,
    getOrCreateChannel,
    markChannelAsRead,
    getUnreadMessagesCount,
    refreshMatches,                   // ✅ Fonction pour refresh manuel des matches
    loading: matchesLoading,          // ✅ Loading depuis useQuery
    error: matchesError || channelsError  // ✅ Erreurs combinées
  };
}