// src/app/chat/page.tsx - VERSION ULTRA SIMPLIFIÉE QUI MARCHE
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Chat,
  ChannelList,
  Channel,
  Window,
  MessageList,
  MessageInput,
  Thread,
  LoadingIndicator
} from 'stream-chat-react';
import 'stream-chat-react/dist/css/v2/index.css';
import AuthGuard from '@/components/auth/AuthGuard';
import { useAuth } from '@/hooks/useAuth';
import { StreamChat } from 'stream-chat';

// Hook ultra simple pour Stream Chat
function useStreamChat(currentUser: any) {
  const [client, setClient] = useState<StreamChat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channelsCreated, setChannelsCreated] = useState(false);

  useEffect(() => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }

    const initializeStream = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔄 === STREAM ULTRA SIMPLE ===');
        console.log('👤 User:', currentUser.name);

        // 1. Récupérer le token
        console.log('🔄 Récupération token...');
        const tokenResponse = await fetch('/api/stream/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id })
        });

        if (!tokenResponse.ok) {
          throw new Error(`Erreur token: ${tokenResponse.status}`);
        }

        const tokenData = await tokenResponse.json();
        if (!tokenData.token) {
          throw new Error('Token manquant');
        }

        console.log('✅ Token récupéré');

        // 2. Connecter à Stream (simple)
        console.log('🔄 Connexion Stream...');
        const streamClient = StreamChat.getInstance(process.env.NEXT_PUBLIC_STREAM_API_KEY!);
        
        await streamClient.connectUser(
          {
            id: currentUser.id,
            name: currentUser.name,
            image: currentUser.image
          },
          tokenData.token
        );

        console.log('✅ Connecté à Stream');
        setClient(streamClient);

        // 3. Créer les channels côté serveur (en arrière-plan)
        console.log('🔄 Création channels côté serveur...');
        
        fetch('/api/matches/create-channels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        .then(async (response) => {
          if (response.ok) {
            const data = await response.json();
            console.log('✅ Channels créés côté serveur:', data.channelsCreated);
            setChannelsCreated(true);
          } else {
            console.warn('⚠️ Erreur création channels côté serveur');
          }
        })
        .catch((err) => {
          console.warn('⚠️ Erreur création channels:', err);
        });

      } catch (err) {
        console.error('❌ Erreur Stream:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };

    initializeStream();

    // Cleanup
    return () => {
      if (client) {
        client.disconnectUser().catch(console.error);
      }
    };
  }, [currentUser?.id]);

  return { client, loading, error, channelsCreated };
}

// Composant de debug minimal
const SimpleDebugPanel = ({ client, currentUser, channelsCreated }: any) => {
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  const runDebug = async () => {
    if (!client) {
      setDebugInfo('❌ Client Stream pas disponible');
      return;
    }

    try {
      // Test simple des channels
      const channels = await client.queryChannels(
        { type: 'messaging', members: { $in: [currentUser.id] } },
        { last_message_at: -1 },
        { limit: 10 }
      );

      let info = `🔍 DEBUG SIMPLE:

✅ Client connecté: ${!!client.user}
👤 User: ${client.user?.name || 'N/A'}
📺 Channels: ${channels.length}
🏗️ Créés côté serveur: ${channelsCreated ? 'Oui' : 'Non'}

`;

      if (channels.length > 0) {
        info += `\n📋 Channels trouvés:\n`;
        channels.forEach((channel, i) => {
          const members = Object.values(channel.state?.members || {});
          const otherMember = members.find((m: any) => m.user_id !== currentUser.id);
          
          info += `${i+1}. ${channel.data?.name || otherMember?.user?.name || 'Inconnu'}\n`;
          info += `   ID: ${channel.id}\n`;
          info += `   Membres: ${members.length}\n`;
          info += `   Messages: ${channel.state?.messages?.length || 0}\n\n`;
        });
      } else {
        info += `\n⚠️ Aucun channel trouvé. Causes possibles:
- Pas de matches dans la DB
- Channels pas encore créés côté serveur
- Problème de permissions`;
      }

      setDebugInfo(info);

    } catch (err) {
      setDebugInfo(`❌ Erreur: ${err instanceof Error ? err.message : 'Inconnue'}`);
    }
  };

  if (!showDebug) {
    return (
      <div className="p-3 bg-blue-50 border-b border-blue-200">
        <button
          onClick={() => setShowDebug(true)}
          className="text-sm text-blue-700 hover:text-blue-900"
        >
          🔧 Debug Simple
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-blue-50 border-b border-blue-200">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-medium text-blue-900">🔧 Debug Simple</h4>
        <button 
          onClick={() => setShowDebug(false)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2">
        <button
          onClick={runDebug}
          className="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
        >
          🔍 Lancer Debug
        </button>

        {debugInfo && (
          <div className="bg-white p-3 rounded border text-sm font-mono whitespace-pre-line">
            {debugInfo}
          </div>
        )}

        <button
          onClick={() => window.location.reload()}
          className="w-full bg-gray-500 text-white px-3 py-2 rounded text-sm hover:bg-gray-600"
        >
          🔄 Recharger
        </button>
      </div>
    </div>
  );
};

// Composant principal ultra simplifié
export default function ChatPage() {
  const { session, isLoading: authLoading } = useAuth();

  // Préparer l'utilisateur pour Stream
  const currentUser = session?.user ? {
    id: session.user.id!,
    name: session.user.name!,
    image: session.user.image || '/default-avatar.png'
  } : null;

  // Initialiser Stream
  const { client, loading: streamLoading, error: streamError, channelsCreated } = useStreamChat(currentUser);

  // Configuration des filtres pour ChannelList
  const channelConfig = useMemo(() => {
    if (!currentUser?.id) return null;

    return {
      filters: {
        type: 'messaging',
        members: { $in: [currentUser.id] }
      },
      sort: { last_message_at: -1 },
      options: { 
        limit: 20, 
        presence: true, 
        state: true,
        watch: true
      }
    };
  }, [currentUser?.id]);

  // États de chargement
  if (authLoading || streamLoading) {
    return (
      <AuthGuard requireAuth={true}>
        <div className="h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <LoadingIndicator size={60} />
            <h2 className="text-xl font-semibold text-gray-800 mb-2 mt-4">
              {authLoading ? 'Vérification...' : 'Connexion au chat...'}
            </h2>
            <p className="text-gray-600">
              Version ultra simplifiée
            </p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  // Gestion des erreurs
  if (streamError) {
    return (
      <AuthGuard requireAuth={true}>
        <div className="h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-500 text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Erreur de connexion
            </h2>
            <p className="text-gray-600 mb-6">{streamError}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-pink-500 text-white px-6 py-3 rounded-lg hover:bg-pink-600 transition-colors font-medium"
            >
              Réessayer
            </button>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (!client || !channelConfig) {
    return (
      <AuthGuard requireAuth={true}>
        <div className="h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Chat non disponible
            </h2>
            <p className="text-gray-600">
              Client Stream manquant
            </p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requireAuth={true}>
      <div className="h-screen bg-gray-50">
        {/* CSS ultra simple */}
        <style jsx global>{`
          .str-chat {
            height: 100vh;
            font-family: inherit;
          }
          
          .str-chat-channel-list {
            background: white;
            border-right: 1px solid #e5e7eb;
            width: 350px;
          }
          
          .str-chat-message-input {
            background: white;
            border-top: 1px solid #e5e7eb;
            padding: 1rem;
          }
        `}</style>
        
        <Chat client={client} theme="str-chat__theme-light">
          <div className="flex h-full">
            
            {/* Liste des conversations - ULTRA SIMPLE */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
              
              {/* Header simple */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">💬</span>
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">Messages</h2>
                    <p className="text-sm text-gray-500">
                      {channelsCreated ? 'Channels créés' : 'En cours...'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Debug panel simple */}
              <SimpleDebugPanel 
                client={client} 
                currentUser={currentUser} 
                channelsCreated={channelsCreated}
              />
              
              {/* Channel List - LAISSONS STREAM GÉRER */}
              <div className="flex-1 overflow-hidden">
                <ChannelList
                  filters={channelConfig.filters}
                  sort={channelConfig.sort}
                  options={channelConfig.options}
                  // Pas de customisation - laissons Stream faire
                />
              </div>
            </div>

            {/* Zone de conversation - ULTRA SIMPLE */}
            <div className="flex-1 flex flex-col bg-white">
              <Channel>
                <Window>
                  <MessageList />
                  
                  {/* MessageInput - LE PLUS SIMPLE POSSIBLE */}
                  <MessageInput 
                    placeholder="Tapez votre message..."
                  />
                </Window>
                <Thread />
              </Channel>
            </div>
          </div>
        </Chat>
      </div>
    </AuthGuard>
  );
}