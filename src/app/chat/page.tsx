// src/app/chat/page.tsx - Page d'intégration complète
'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  MessageCircle, 
  Users, 
  ArrowLeft, 
  Search, 
  Heart,
  Sparkles,
  Send,
  Phone,
  Video,
  Wifi,
  WifiOff,
  Archive,
  RefreshCw,
  Settings,
  UserPlus
} from 'lucide-react';
import ChatSystem from './../../components/chat/ChatSystem';

// Types
interface User {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  age?: number;
  bio?: string;
  location?: string;
  profession?: string;
  interests?: string[];
}

interface Conversation {
  id: string;
  type: string;
  users: User[];
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    receiverId: string;
    createdAt: string;
    readAt?: string | null;
    type: string;
    attachments: any[];
    sender: User;
  };
  unreadCount: number;
  messageCount?: number;
  lastActivity?: string;
  createdAt: string;
  relationshipStatus: string;
  hasMatch: boolean;
  metadata?: {
    canMessage: boolean;
    isMatch?: boolean;
    sentLike?: boolean;
    receivedLike?: boolean;
    mutualLike?: boolean;
  };
}

interface Match {
  id: string;
  user: User;
  matchedAt: string;
  compatibility?: number;
}

interface ChatState {
  mode: 'dashboard' | 'chat';
  selectedUser: User | null;
}

export default function ChatPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // États principaux
  const [chatState, setChatState] = useState<ChatState>({
    mode: 'dashboard',
    selectedUser: null
  });
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'conversations' | 'matches' | 'discover'>('conversations');
  const [searchQuery, setSearchQuery] = useState('');

  // États de connexion
  const [isOnline, setIsOnline] = useState(navigator?.onLine ?? true);
  const [serverStatus, setServerStatus] = useState<any>(null);

  // Charger l'utilisateur actuel
  const loadCurrentUser = async () => {
    try {
      const response = await fetch('/api/user/current');
      const data = await response.json();
      if (data.success) {
        setCurrentUser(data.user);
        return data.user;
      }
    } catch (error) {
      console.error('Erreur chargement utilisateur actuel:', error);
    }
    return null;
  };

  // Charger les conversations
  const loadConversations = async () => {
    try {
      const response = await fetch('/api/conversations');
      if (response.ok) {
        const data = await response.json();
        if (data.conversations) {
          setConversations(data.conversations || []);
        }
      }
    } catch (error) {
      console.error('Erreur chargement conversations:', error);
    }
  };

  // Charger les matchs
  const loadMatches = async () => {
    try {
      const response = await fetch('/api/matches');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const matchesWithoutConvo = data.matches.filter((match: Match) => 
            !conversations.some(conv => {
              const otherUser = conv.users?.find(u => u.id !== currentUser?.id);
              return otherUser?.id === match.user.id;
            })
          );
          setMatches(matchesWithoutConvo);
        }
      }
    } catch (error) {
      console.error('Erreur chargement matchs:', error);
    }
  };

  // Vérifier le statut du serveur
  const checkServerStatus = async () => {
    try {
      const response = await fetch('/api/socket-stats');
      if (response.ok) {
        const data = await response.json();
        setServerStatus(data);
      }
    } catch (error) {
      console.error('Erreur statut serveur:', error);
    }
  };

  // Chargement initial
  useEffect(() => {
    const initializePage = async () => {
      if (status === 'loading') return;
      
      if (status === 'unauthenticated') {
        router.push('/auth/signin');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const user = await loadCurrentUser();
        
        if (user) {
          await Promise.all([
            loadConversations(),
            loadMatches(),
            checkServerStatus()
          ]);

          // Vérifier si on a un chat direct via URL
          const userIdParam = searchParams.get('userId');
          if (userIdParam) {
            // Chercher dans les conversations
            const targetConversation = conversations.find(conv => {
              const otherUser = conv.users?.find(u => u.id !== user.id);
              return otherUser?.id === userIdParam;
            });

            const targetUser = targetConversation 
              ? targetConversation.users.find(u => u.id !== user.id)
              : matches.find(match => match.user.id === userIdParam)?.user;

            if (targetUser) {
              setChatState({
                mode: 'chat',
                selectedUser: targetUser
              });
            } else {
              setError(`Conversation introuvable avec ${userIdParam}`);
            }
          }
        }

      } catch (error: any) {
        console.error('Erreur initialisation chat:', error);
        setError(`Erreur d'initialisation: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    initializePage();
  }, [status, router, searchParams]);

  // Recharger les matchs après les conversations
  useEffect(() => {
    if (conversations.length > 0 && currentUser) {
      loadMatches();
    }
  }, [conversations, currentUser]);

  // Gestion de la connectivité
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Démarrer une conversation
  const startConversation = (user: User) => {
    console.log('💬 Démarrage conversation avec:', user.name, user.id);
    setChatState({
      mode: 'chat',
      selectedUser: user
    });
  };

  // Retour au dashboard
  const backToDashboard = () => {
    setChatState({
      mode: 'dashboard',
      selectedUser: null
    });
    loadConversations();
    loadMatches();
    checkServerStatus();
  };

  // Filtrer les éléments par recherche
  const filteredConversations = conversations.filter(conv => {
    // Trouver l'autre utilisateur dans la conversation
    const otherUser = conv.users?.find(u => u.id !== currentUser?.id);
    return otherUser && (
      otherUser.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      otherUser.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredMatches = matches.filter(match =>
    match.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    match.user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculer le temps depuis la dernière activité
  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'À l\'instant';
    if (diffMinutes < 60) return `${diffMinutes}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `${diffDays}j`;
    return date.toLocaleDateString();
  };

  // Interface de chargement
  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de vos conversations...</p>
          <div className="mt-2 flex items-center justify-center space-x-4 text-xs text-gray-500">
            <span>Réseau: {isOnline ? '🌐 En ligne' : '📡 Hors ligne'}</span>
            {serverStatus && (
              <span>Serveur: {serverStatus.connectedUsers} connectés</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Interface d'erreur
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-red-600 text-center mb-4">
            <MessageCircle size={48} className="mx-auto mb-2" />
            <h2 className="text-lg font-semibold">Erreur de Chat</h2>
          </div>
          <p className="text-gray-600 text-center mb-4">{error}</p>
          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700 transition-colors"
            >
              Recharger
            </button>
            <button
              onClick={checkServerStatus}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Vérifier le serveur
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Mode Chat - Affichage du ChatSystem
  if (chatState.mode === 'chat' && chatState.selectedUser && currentUser) {
    return (
      <div className="h-screen bg-gray-50">
        <div className="container mx-auto h-full max-w-4xl">
          {/* Header avec bouton retour */}
          <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={backToDashboard}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mr-4"
              >
                <ArrowLeft size={20} />
                <span>Retour</span>
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  {chatState.selectedUser.image ? (
                    <img
                      src={chatState.selectedUser.image}
                      alt={chatState.selectedUser.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    chatState.selectedUser.name?.charAt(0) || '?'
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">{chatState.selectedUser.name}</h3>
                  <p className="text-sm text-gray-500">
                    {chatState.selectedUser.age && `${chatState.selectedUser.age} ans`}
                    {chatState.selectedUser.location && ` • ${chatState.selectedUser.location}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Statuts système */}
            <div className="flex items-center space-x-2">
              <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs ${
                isOnline 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                <span>{isOnline ? 'En ligne' : 'Hors ligne'}</span>
              </div>
              
              {serverStatus && (
                <div className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                  {serverStatus.connectedUsers} connectés
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-white h-full shadow-lg">
            <ChatSystem
              currentUser={currentUser}
              remoteUser={chatState.selectedUser}
              onClose={backToDashboard}
            />
          </div>
        </div>
      </div>
    );
  }

  // Mode Dashboard - Vue d'ensemble
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-6xl p-4">
        {/* Header principal */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
                <MessageCircle className="text-pink-600" />
                <span>Messages</span>
                {isOnline ? (
                  <Wifi className="text-green-600" size={24} />
                ) : (
                  <WifiOff className="text-red-600" size={24} />
                )}
              </h1>
              <p className="text-gray-600 mt-1">
                Vos conversations et nouveaux matchs
              </p>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold text-pink-600">
                {conversations.length + matches.length}
              </div>
              <div className="text-sm text-gray-500">
                {conversations.length} conversation{conversations.length > 1 ? 's' : ''} • 
                {matches.length} nouveau{matches.length > 1 ? 'x' : ''} match{matches.length > 1 ? 's' : ''}
              </div>
              
              {serverStatus && (
                <div className="mt-2 bg-blue-50 border border-blue-200 rounded p-2">
                  <div className="text-blue-700 text-sm font-medium">
                    🚀 Serveur WebRTC actif
                  </div>
                  <div className="text-blue-600 text-xs">
                    {serverStatus.connectedUsers} utilisateurs connectés
                  </div>
                  <div className="text-blue-600 text-xs">
                    Fonctionnalités: {serverStatus.features?.join(', ')}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Rechercher une conversation ou un match..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
        </div>

        {/* Navigation par onglets */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('conversations')}
              className={`flex-1 px-6 py-4 font-medium text-center transition-colors ${
                activeTab === 'conversations'
                  ? 'text-pink-600 border-b-2 border-pink-600 bg-pink-50'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <MessageCircle size={18} />
                <span>Conversations ({filteredConversations.length})</span>
                {conversations.some(c => c.unreadCount > 0) && (
                  <div className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {conversations.reduce((sum, c) => sum + c.unreadCount, 0)}
                  </div>
                )}
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('matches')}
              className={`flex-1 px-6 py-4 font-medium text-center transition-colors ${
                activeTab === 'matches'
                  ? 'text-pink-600 border-b-2 border-pink-600 bg-pink-50'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Heart size={18} />
                <span>Nouveaux matchs ({filteredMatches.length})</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('discover')}
              className={`flex-1 px-6 py-4 font-medium text-center transition-colors ${
                activeTab === 'discover'
                  ? 'text-pink-600 border-b-2 border-pink-600 bg-pink-50'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Users size={18} />
                <span>Découvrir</span>
              </div>
            </button>
          </div>
        </div>

        {/* Contenu des onglets */}
        {activeTab === 'conversations' && (
          <div className="space-y-4">
            {filteredConversations.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <MessageCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery ? 'Aucune conversation trouvée' : 'Aucune conversation en cours'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchQuery ? 'Essayez avec d\'autres mots-clés' : 'Commencez à chatter avec vos matchs !'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setActiveTab('matches')}
                    className="px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
                  >
                    Voir vos matchs
                  </button>
                )}
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                // Trouver l'autre utilisateur dans la conversation
                const otherUser = conversation.users?.find(u => u.id !== currentUser?.id);
                if (!otherUser) return null;
                
                return (
                <div
                  key={conversation.id}
                  onClick={() => startConversation(otherUser)}
                  className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
                >
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      {otherUser.image ? (
                        <img
                          src={otherUser.image}
                          alt={otherUser.name}
                          className="w-14 h-14 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-gradient-to-br from-pink-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {otherUser.name?.charAt(0) || '?'}
                        </div>
                      )}
                      
                      {conversation.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
                          {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {otherUser.name || otherUser.email?.split('@')[0]}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {getTimeAgo(conversation.lastActivity || conversation.createdAt)}
                        </span>
                      </div>
                      
                      {conversation.lastMessage && (
                        <p className="text-sm text-gray-600 truncate">
                          {conversation.lastMessage.senderId === currentUser?.id ? 'Vous: ' : ''}
                          {conversation.lastMessage.content}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          {conversation.messageCount || 0} message{(conversation.messageCount || 0) > 1 ? 's' : ''}
                        </span>
                        <div className="flex items-center space-x-1">
                          {conversation.hasMatch && <Heart className="text-red-400" size={12} />}
                          <Send size={14} className="text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )})
            )}
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="space-y-4">
            {filteredMatches.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <Heart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery ? 'Aucun match trouvé' : 'Aucun nouveau match'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchQuery ? 'Essayez avec d\'autres mots-clés' : 'Continuez à swiper pour trouver de nouveaux matchs !'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => router.push('/discover')}
                    className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all"
                  >
                    Découvrir des profils
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMatches.map((match) => (
                  <div
                    key={match.id}
                    className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow border border-gray-200"
                  >
                    <div className="relative h-32">
                      {match.user.image ? (
                        <img
                          src={match.user.image}
                          alt={match.user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center">
                          <span className="text-white text-3xl font-bold">
                            {match.user.name?.charAt(0) || '?'}
                          </span>
                        </div>
                      )}
                      
                      <div className="absolute top-2 left-2">
                        <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                          Nouveau match
                        </span>
                      </div>
                      
                      {match.compatibility && (
                        <div className="absolute top-2 right-2">
                          <div className="bg-white bg-opacity-90 text-pink-600 text-xs font-bold px-2 py-1 rounded-full">
                            {match.compatibility}% ♥
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {match.user.name || match.user.email?.split('@')[0]}
                      </h3>
                      
                      <p className="text-sm text-gray-500 mb-3">
                        Matchés {getTimeAgo(match.matchedAt)}
                        {match.user.age && ` • ${match.user.age} ans`}
                      </p>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => startConversation(match.user)}
                          className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all"
                        >
                          <Send size={16} />
                          <span>Message</span>
                        </button>
                        <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                          <Phone size={16} className="text-gray-600" />
                        </button>
                        <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                          <Video size={16} className="text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'discover' && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Découvrez de nouveaux profils
            </h3>
            <p className="text-gray-500 mb-4">
              Explorez et rencontrez de nouvelles personnes compatibles avec vous
            </p>
            <button
              onClick={() => router.push('/discover')}
              className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all flex items-center space-x-2 mx-auto"
            >
              <Sparkles size={20} />
              <span>Commencer à découvrir</span>
            </button>
          </div>
        )}

        {/* Action flottante */}
        <div className="fixed bottom-6 right-6 flex flex-col space-y-3">
          <button
            onClick={checkServerStatus}
            className="w-12 h-12 bg-blue-500 text-white rounded-full shadow-lg hover:shadow-xl hover:bg-blue-600 transition-all duration-200 flex items-center justify-center"
            title="Statut serveur"
          >
            <RefreshCw size={20} />
          </button>
          
          <button
            onClick={() => router.push('/discover')}
            className="w-14 h-14 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl hover:from-pink-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center group"
            title="Découvrir de nouveaux profils"
          >
            <Sparkles size={24} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}