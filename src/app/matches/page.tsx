// src/app/matches/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  HeartIcon,
  ChatBubbleLeftIcon,
  ClockIcon,
  UserIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';

interface Match {
  id: string;
  matchedAt: string;
  user: {
    id: string;
    name: string;
    age?: number;
    photo: string | null;
  };
  lastMessage: {
    content: string;
    sentAt: string;
    isFromCurrentUser: boolean;
    senderName: string;
  } | null;
  unreadCount: number;
  isNewMatch: boolean;
}

interface MatchesData {
  matches: Match[];
  stats: {
    totalMatches: number;
    newMatches: number;
    activeConversations: number;
  };
  message?: string;
}

const MatchCard: React.FC<{ match: Match; onClick: () => void }> = ({ match, onClick }) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'À l\'instant';
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    if (diffInHours < 48) return 'Hier';
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:shadow-md transition-all"
    >
      <div className="flex items-center space-x-4">
        {/* Photo de profil */}
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center overflow-hidden">
            {match.user.photo ? (
              <img
                src={match.user.photo}
                alt={match.user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon className="w-8 h-8 text-gray-400" />
            )}
          </div>
          
          {/* Badge nouveau match */}
          {match.isNewMatch && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center">
              <SparklesIcon className="w-3 h-3 text-white" />
            </div>
          )}
          
          {/* Badge messages non lus */}
          {match.unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-bold">{match.unreadCount}</span>
            </div>
          )}
        </div>

        {/* Informations du match */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-gray-900 truncate">
              {match.user.name}
              {match.user.age && <span className="text-gray-500 font-normal">, {match.user.age}</span>}
            </h3>
            <span className="text-xs text-gray-500 flex-shrink-0">
              {formatTime(match.lastMessage?.sentAt || match.matchedAt)}
            </span>
          </div>
          
          {match.lastMessage ? (
            <p className="text-sm text-gray-600 truncate">
              {match.lastMessage.isFromCurrentUser ? 'Vous: ' : ''}
              {match.lastMessage.content}
            </p>
          ) : match.isNewMatch ? (
            <p className="text-sm text-pink-600 font-medium">
              🎉 Nouveau match ! Dites bonjour !
            </p>
          ) : (
            <p className="text-sm text-gray-500 italic">
              Match sans conversation
            </p>
          )}
        </div>

        {/* Icône de chat */}
        <div className="flex-shrink-0">
          <ChatBubbleLeftIcon className="w-5 h-5 text-gray-400" />
        </div>
      </div>
    </motion.div>
  );
};

const StatsCard: React.FC<{
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, icon, color }) => {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-600">{title}</p>
        </div>
      </div>
    </div>
  );
};

export default function MatchesPage() {
  const [matchesData, setMatchesData] = useState<MatchesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMatches = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/matches');
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des matches');
      }

      const data = await response.json();
      console.log('📊 Données matches reçues:', data);
      setMatchesData(data);

    } catch (err: any) {
      console.error('❌ Erreur chargement matches:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  const handleMatchClick = (match: Match) => {
    console.log('💬 Clic sur match:', match.user.name);
    // TODO: Naviguer vers la conversation
    // router.push(`/chat/${match.id}`);
    alert(`Conversation avec ${match.user.name} (à implémenter)`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de vos matches...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="text-6xl mb-4">😞</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Erreur</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <button
            onClick={loadMatches}
            className="bg-pink-500 text-white px-6 py-3 rounded-lg hover:bg-pink-600 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!matchesData || matchesData.matches.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              Mes Matches
            </h1>
          </div>
        </div>

        {/* État vide */}
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center max-w-md mx-4">
            <div className="text-6xl mb-4">💔</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Aucun match</h2>
            <p className="text-gray-600 mb-6">
              Commencez à swiper pour découvrir des personnes compatibles et créer vos premiers matches !
            </p>
            <a
              href="/discover"
              className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white px-8 py-3 rounded-full font-semibold hover:from-pink-600 hover:to-purple-600 transition-all"
            >
              Découvrir des profils
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            Mes Matches
          </h1>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Statistiques */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatsCard
            title="Matches"
            value={matchesData.stats.totalMatches}
            icon={<HeartSolid className="w-5 h-5 text-white" />}
            color="bg-gradient-to-r from-pink-500 to-rose-500"
          />
          <StatsCard
            title="Nouveaux"
            value={matchesData.stats.newMatches}
            icon={<SparklesIcon className="w-5 h-5 text-white" />}
            color="bg-gradient-to-r from-purple-500 to-indigo-500"
          />
          <StatsCard
            title="Conversations"
            value={matchesData.stats.activeConversations}
            icon={<ChatBubbleLeftIcon className="w-5 h-5 text-white" />}
            color="bg-gradient-to-r from-blue-500 to-cyan-500"
          />
        </div>

        {/* Message optionnel */}
        {matchesData.message && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800 text-center">{matchesData.message}</p>
          </div>
        )}

        {/* Liste des matches */}
        <div className="space-y-3">
          {matchesData.matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              onClick={() => handleMatchClick(match)}
            />
          ))}
        </div>

        {/* Action en bas */}
        <div className="mt-8 text-center">
          <a
            href="/discover"
            className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white px-8 py-3 rounded-full font-semibold hover:from-pink-600 hover:to-purple-600 transition-all"
          >
            Découvrir plus de profils
          </a>
        </div>
      </div>
    </div>
  );
}