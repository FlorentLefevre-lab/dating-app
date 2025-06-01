// src/hooks/useMatches.ts
import { useState, useEffect, useCallback } from 'react';

interface Match {
  id: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    age: number;
    bio: string;
    location: string;
    department: string;
    region: string;
    profession: string;
    interests: string[];
    photo: {
      id: string;
      url: string;
      isPrimary: boolean;
    } | null;
  };
  conversation: {
    messageCount: number;
    lastMessage: {
      id: string;
      content: string;
      createdAt: string;
      senderId: string;
      senderName: string;
      isFromCurrentUser: boolean;
    } | null;
    hasUnreadMessages: boolean;
  };
}

interface MatchStats {
  totalMatches: number;
  newMatches: number;
  activeConversations: number;
}

interface UseMatchesResult {
  matches: Match[];
  stats: MatchStats;
  loading: boolean;
  error: string | null;
  actions: {
    loadMatches: () => Promise<void>;
    refreshMatches: () => Promise<void>;
    markAsRead: (matchId: string) => Promise<void>;
    getMatchById: (matchId: string) => Match | null;
  };
}

export const useMatches = (): UseMatchesResult => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [stats, setStats] = useState<MatchStats>({
    totalMatches: 0,
    newMatches: 0,
    activeConversations: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les matches
  const loadMatches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/matches');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors du chargement des matches');
      }

      const data = await response.json();
      setMatches(data.matches);
      setStats(data.stats);

      console.log('✅ Matches chargés:', data.matches.length);

    } catch (err: any) {
      console.error('❌ Erreur chargement matches:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Actualiser les matches
  const refreshMatches = useCallback(async () => {
    await loadMatches();
  }, [loadMatches]);

  // Marquer un match comme lu (quand on ouvre la conversation)
  const markAsRead = useCallback(async (matchId: string) => {
    try {
      // TODO: Implémenter l'API pour marquer les messages comme lus
      console.log('📖 Marquer comme lu:', matchId);
      
      // Mettre à jour localement en attendant
      setMatches(prev => 
        prev.map(match => 
          match.id === matchId 
            ? { ...match, conversation: { ...match.conversation, hasUnreadMessages: false } }
            : match
        )
      );

    } catch (error) {
      console.error('❌ Erreur markAsRead:', error);
    }
  }, []);

  // Récupérer un match par ID
  const getMatchById = useCallback((matchId: string): Match | null => {
    return matches.find(match => match.id === matchId) || null;
  }, [matches]);

  // Charger au montage du composant
  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  // Actualiser périodiquement (optionnel)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        refreshMatches();
      }
    }, 30000); // Actualiser toutes les 30 secondes

    return () => clearInterval(interval);
  }, [loading, refreshMatches]);

  return {
    matches,
    stats,
    loading,
    error,
    actions: {
      loadMatches,
      refreshMatches,
      markAsRead,
      getMatchById
    }
  };
};