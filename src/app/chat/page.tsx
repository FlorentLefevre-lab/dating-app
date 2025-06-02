// src/app/chat/page.tsx - Version avec sélection d'utilisateurs
'use client';

import React, { useState, useEffect } from 'react';
import { ChatSystem } from '@/components/chat/ChatSystem';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { MessageCircle, Users, ArrowLeft, Search, User } from 'lucide-react';

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

interface ChatState {
  mode: 'selection' | 'chat';
  selectedUser: User | null;
}

export default function ChatPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  
  // États
  const [chatState, setChatState] = useState<ChatState>({
    mode: 'selection',
    selectedUser: null
  });
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Charger les utilisateurs depuis l'API
  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/users/list');
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Exclure l'utilisateur actuel de la liste
      const currentUserEmail = session?.user?.email;
      const filteredUsers = data.users?.filter((user: User) => 
        user.email !== currentUserEmail && user.id !== currentUserEmail
      ) || [];
      
      setAvailableUsers(filteredUsers);
      console.log(`✅ ${filteredUsers.length} utilisateurs chargés`);
      
    } catch (error: any) {
      console.error('❌ Erreur chargement utilisateurs:', error);
      setError(`Impossible de charger les utilisateurs: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Chargement initial
  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      setError('Vous devez être connecté pour accéder au chat');
      setIsLoading(false);
      return;
    }

    // Vérifier si on a des paramètres URL pour chat direct
    const userIdParam = searchParams.get('userId');
    if (userIdParam) {
      // Chat direct via URL
      setChatState({
        mode: 'chat',
        selectedUser: {
          id: userIdParam,
          name: `User ${userIdParam.split('@')[0]}`,
          email: userIdParam
        }
      });
      setIsLoading(false);
    } else {
      // Mode sélection - charger tous les utilisateurs
      loadUsers();
    }
  }, [status, session, searchParams]);

  // Utilisateurs filtrés par recherche
  const filteredUsers = availableUsers.filter(user => {
    if (!searchTerm) return true;
    
    const search = searchTerm.toLowerCase();
    return (
      user.name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.profession?.toLowerCase().includes(search) ||
      user.location?.toLowerCase().includes(search) ||
      user.interests?.some(interest => interest.toLowerCase().includes(search))
    );
  });

  // Démarrer une conversation
  const startConversation = (user: User) => {
    console.log('💬 Démarrage conversation avec:', user.name || user.email);
    setChatState({
      mode: 'chat',
      selectedUser: user
    });
  };

  // Retour à la sélection
  const backToSelection = () => {
    setChatState({
      mode: 'selection',
      selectedUser: null
    });
  };

  // Utilisateur actuel
  const currentUser: User = {
    id: session?.user?.email || 'anonymous',
    name: session?.user?.name || 'Moi',
    email: session?.user?.email || undefined,
    image: session?.user?.image || undefined
  };

  // Interface de chargement
  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {status === 'loading' ? 'Chargement de la session...' : 'Chargement des utilisateurs...'}
          </p>
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
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Recharger
            </button>
            <button
              onClick={loadUsers}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Mode Chat - Affichage du ChatSystem
  if (chatState.mode === 'chat' && chatState.selectedUser) {
    return (
      <div className="h-screen bg-gray-50">
        <div className="container mx-auto h-full max-w-4xl">
          {/* Bouton retour */}
          <div className="bg-white border-b px-4 py-2">
            <button
              onClick={backToSelection}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft size={16} />
              <span>Retour à la liste</span>
            </button>
          </div>
          
          {/* Debug info en développement */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-blue-50 p-2 text-xs text-blue-800">
              <strong>Debug Chat:</strong> 
              {currentUser.email} ↔ {chatState.selectedUser.email} |
              Socket: {process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'} |
              <span className="text-green-600 font-medium">Chat Libre Universel</span>
            </div>
          )}
          
          <div className="bg-white h-full shadow-lg">
            <ChatSystem
              currentUser={currentUser}
              remoteUser={chatState.selectedUser}
              onClose={backToSelection}
            />
          </div>
        </div>
      </div>
    );
  }

  // Mode Sélection - Liste des utilisateurs
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-6xl p-4">
        {/* En-tête */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                <MessageCircle className="text-blue-600" />
                <span>Chat Universel</span>
              </h1>
              <p className="text-gray-600 mt-1">
                Connecté en tant que <strong>{currentUser.name || currentUser.email}</strong>
              </p>
              <p className="text-sm text-green-600 font-medium">
                💬 Chattez avec n'importe qui - Aucun match requis !
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{filteredUsers.length}</div>
              <div className="text-sm text-gray-500">
                utilisateur{filteredUsers.length > 1 ? 's' : ''} disponible{filteredUsers.length > 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, email, profession, ville, centres d'intérêt..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {searchTerm && (
            <p className="text-sm text-gray-500 mt-2">
              {filteredUsers.length} résultat{filteredUsers.length > 1 ? 's' : ''} pour "{searchTerm}"
            </p>
          )}
        </div>

        {/* Liste des utilisateurs */}
        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'Aucun utilisateur trouvé' : 'Aucun utilisateur disponible'}
            </h3>
            <p className="text-gray-500">
              {searchTerm ? 
                'Essayez avec d\'autres mots-clés.' : 
                'Il n\'y a pas encore d\'autres utilisateurs inscrits.'
              }
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-3 text-blue-600 hover:text-blue-800"
              >
                Afficher tous les utilisateurs
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border border-gray-200"
              >
                <div className="flex items-start space-x-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {user.image ? (
                      <img
                        src={user.image}
                        alt={user.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {user.name?.charAt(0) || user.email?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>

                  {/* Infos utilisateur */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {user.name || user.email?.split('@')[0]}
                    </h3>
                    
                    {user.age && (
                      <p className="text-sm text-gray-500">{user.age} ans</p>
                    )}
                    
                    {user.profession && (
                      <p className="text-sm text-blue-600 font-medium truncate">
                        {user.profession}
                      </p>
                    )}
                    
                    {user.location && (
                      <p className="text-sm text-gray-500 truncate">📍 {user.location}</p>
                    )}
                    
                    {user.bio && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {user.bio}
                      </p>
                    )}
                    
                    {user.interests && user.interests.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {user.interests.slice(0, 3).map((interest, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full"
                          >
                            {interest}
                          </span>
                        ))}
                        {user.interests.length > 3 && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                            +{user.interests.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bouton de chat */}
                <button
                  onClick={() => startConversation(user)}
                  className="w-full mt-3 flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
                >
                  <MessageCircle size={16} />
                  <span>Commencer une conversation</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Stats en bas */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Chat universel sans restriction • 
            {availableUsers.length} utilisateur{availableUsers.length > 1 ? 's' : ''} • 
            Connecté en tant que {currentUser.email}
          </p>
        </div>
      </div>
    </div>
  );
}