// src/components/chat/ChatSystem.tsx - Version pur universelle (sans match)
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useChat } from '@/hooks/useChat';

interface User {
  id: string;
  name?: string;
  email?: string;
  image?: string;
}

interface ChatSystemProps {
  currentUser: User;
  remoteUser: User;
  onClose?: () => void;
}

interface DebugLog {
  timestamp: Date;
  type: 'sent' | 'received' | 'auth' | 'error' | 'system' | 'conversation';
  message: string;
  data?: any;
}

export const ChatSystem: React.FC<ChatSystemProps> = ({
  currentUser,
  remoteUser,
  onClose
}) => {
  const {
    connected,
    authenticated,
    conversations,
    activeConversation,
    onlineUsers,
    stats,
    startConversation,
    sendMessage,
    openConversation,
    closeConversation,
    getActiveMessages,
    isUserOnline,
    error: chatError,
    clearError
  } = useChat();
  
  // États du chat
  const [newMessage, setNewMessage] = useState<string>('');
  const [conversationStarted, setConversationStarted] = useState<boolean>(false);
  
  // Debug
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [showDebug, setShowDebug] = useState<boolean>(true);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationInitRef = useRef<boolean>(false);

  // Vérification des paramètres
  const hasRequiredParams = Boolean(currentUser?.id && remoteUser?.id);

  // Fonction de debug stable
  const addDebugLog = useCallback((type: DebugLog['type'], message: string, data?: any) => {
    const log: DebugLog = {
      timestamp: new Date(),
      type,
      message,
      data
    };
    
    console.log(`🐛 [${type.toUpperCase()}] ${message}`, data || '');
    
    setDebugLogs(prev => [...prev.slice(-20), log]);
  }, []);

  // Debug initial
  useEffect(() => {
    addDebugLog('system', 'ChatSystem Pur Universel initialisé', {
      connected,
      authenticated,
      currentUser: currentUser?.id,
      remoteUser: remoteUser?.id,
      conversationsCount: conversations.length,
      onlineUsersCount: stats.onlineUsersCount,
      chatType: 'Pure Universal (No Match System)'
    });
  }, [connected, authenticated, currentUser?.id, remoteUser?.id, conversations.length, stats.onlineUsersCount, addDebugLog]);

  // Fonction pour créer l'ID de conversation universel
  const createConversationId = useCallback((userId1: string, userId2: string) => {
    const sorted = [userId1, userId2].sort();
    return `conv_${sorted[0].replace(/[@.]/g, '_')}_${sorted[1].replace(/[@.]/g, '_')}`;
  }, []);

  // Recherche et démarrage de conversation
  useEffect(() => {
    if (!connected || !authenticated || !hasRequiredParams || conversationInitRef.current) {
      return;
    }

    addDebugLog('conversation', 'Recherche conversation pure existante', { 
      targetUser: remoteUser.id,
      targetName: remoteUser.name,
      availableConversations: conversations.length,
      chatType: 'Pure Universal'
    });
    
    conversationInitRef.current = true;

    // Créer l'ID de conversation universel
    const expectedConvId = createConversationId(currentUser.id, remoteUser.id);
    
    addDebugLog('conversation', 'ID conversation pur calculé', { 
      expectedConvId,
      currentUserId: currentUser.id,
      remoteUserId: remoteUser.id
    });

    // Chercher une conversation existante avec cet utilisateur
    const existingConv = conversations.find(conv => 
      conv.with?.id === remoteUser.id || conv.id === expectedConvId
    );

    if (existingConv) {
      addDebugLog('conversation', '✅ Conversation pure existante trouvée', { 
        conversationId: existingConv.id,
        withUser: existingConv.with?.name || existingConv.with?.id
      });
      openConversation(existingConv.id);
      setConversationStarted(true);
    } else {
      addDebugLog('conversation', '🆕 Création nouvelle conversation pure');
      startConversation(remoteUser.id);
    }
  }, [connected, authenticated, hasRequiredParams, remoteUser.id, remoteUser.name, conversations, startConversation, openConversation, currentUser.id, createConversationId, addDebugLog]);

  // Reset si déconnexion
  useEffect(() => {
    if (!connected || !authenticated) {
      conversationInitRef.current = false;
      setConversationStarted(false);
      addDebugLog('system', 'Reset état conversation (déconnexion)');
    }
  }, [connected, authenticated, addDebugLog]);

  // Surveillance conversation active
  useEffect(() => {
    if (activeConversation && !conversationStarted) {
      addDebugLog('conversation', '✅ Conversation pure activée', { 
        conversationId: activeConversation 
      });
      setConversationStarted(true);
      scrollToBottom();
    }
  }, [activeConversation, conversationStarted, addDebugLog]);

  // Surveillance des messages
  const messages = getActiveMessages();
  useEffect(() => {
    if (messages.length > 0 && conversationStarted) {
      addDebugLog('received', `${messages.length} messages dans la conversation pure`);
      scrollToBottom();
    }
  }, [messages.length, conversationStarted, addDebugLog]);

  // Surveillance utilisateur en ligne
  useEffect(() => {
    const isRemoteOnline = isUserOnline(remoteUser.id);
    addDebugLog('system', `Statut ${remoteUser.name || remoteUser.id}`, { 
      online: isRemoteOnline,
      totalOnline: stats.onlineUsersCount
    });
  }, [remoteUser.id, remoteUser.name, isUserOnline, stats.onlineUsersCount, addDebugLog]);

  // Scroll automatique
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Envoi de message
  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim() || !connected || !authenticated || !activeConversation) {
      addDebugLog('error', 'Envoi bloqué', { 
        message: !!newMessage.trim(), 
        connected,
        authenticated,
        activeConversation: !!activeConversation
      });
      return;
    }

    addDebugLog('sent', `Envoi: "${newMessage.trim()}"`, {
      conversationId: activeConversation,
      to: remoteUser.id,
      chatType: 'Pure Universal'
    });

    sendMessage(activeConversation, newMessage.trim());
    setNewMessage('');
    scrollToBottom();
  }, [newMessage, connected, authenticated, activeConversation, sendMessage, remoteUser.id, scrollToBottom, addDebugLog]);

  // Gestion clavier
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Test de connectivité
  const testConnection = useCallback(() => {
    addDebugLog('system', 'Test de connectivité pure', {
      connected,
      authenticated,
      activeConversation,
      messagesCount: messages.length,
      conversationsCount: conversations.length,
      onlineUsersCount: stats.onlineUsersCount,
      expectedConvId: createConversationId(currentUser.id, remoteUser.id),
      chatType: 'Pure Universal'
    });

    if (connected && authenticated && !activeConversation) {
      addDebugLog('system', 'Redémarrage conversation pure');
      conversationInitRef.current = false;
      startConversation(remoteUser.id);
    }
  }, [connected, authenticated, activeConversation, messages.length, conversations.length, stats.onlineUsersCount, startConversation, remoteUser.id, currentUser.id, createConversationId, addDebugLog]);

  // Fermeture du chat
  const handleClose = useCallback(() => {
    addDebugLog('system', 'Fermeture du chat pur');
    if (activeConversation) {
      closeConversation();
    }
    onClose?.();
  }, [activeConversation, closeConversation, onClose, addDebugLog]);

  // Gestion des erreurs
  useEffect(() => {
    if (chatError) {
      addDebugLog('error', `Erreur chat: ${chatError}`);
    }
  }, [chatError, addDebugLog]);

  // Interface d'erreur
  if (chatError) {
    return (
      <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg">
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">Erreur de Chat Pur</div>
          <div className="text-red-500 text-sm mb-4">{chatError}</div>
          <div className="text-xs text-gray-600 mb-4">
            <div>Socket URL: {process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'}</div>
            <div>Current User: {currentUser.id}</div>
            <div>Remote User: {remoteUser.id}</div>
            <div>Chat Type: Pure Universal (No Match)</div>
          </div>
          <button
            onClick={clearError}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // Interface de paramètres manquants
  if (!hasRequiredParams) {
    return (
      <div className="flex items-center justify-center h-96 bg-yellow-50 rounded-lg">
        <div className="text-center">
          <div className="text-yellow-600 text-lg font-semibold mb-2">Configuration incomplète</div>
          <div className="text-yellow-500 text-sm mb-4">Paramètres utilisateur manquants</div>
          <div className="text-xs text-gray-600 space-y-1">
            <div>Current User: {currentUser?.id || '❌ Manquant'}</div>
            <div>Remote User: {remoteUser?.id || '❌ Manquant'}</div>
            <div>Chat Type: Pure Universal (No Match Required)</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Zone de chat principale */}
      <div className="flex-1 flex flex-col">
        {/* En-tête */}
        <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white font-semibold">
                {remoteUser?.image ? (
                  <img src={remoteUser.image} alt={remoteUser.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  (remoteUser?.name || remoteUser?.email || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h3 className="font-semibold">
                  {remoteUser?.name || remoteUser?.email?.split('@')[0] || 'Utilisateur'}
                </h3>
                <div className="flex items-center space-x-2 text-sm opacity-90">
                  <div className={`w-2 h-2 rounded-full ${
                    connected && authenticated ? 'bg-green-400' : 'bg-red-400'
                  }`}></div>
                  <span>
                    {connected && authenticated ? (
                      isUserOnline(remoteUser.id) ? 'En ligne' : 'Hors ligne'
                    ) : 'Connexion...'}
                  </span>
                  <span className="text-xs bg-white/20 px-2 py-1 rounded">
                    Chat Universel
                  </span>
                </div>
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="px-3 py-1 text-xs bg-white/20 rounded hover:bg-white/30 transition-colors"
              >
                {showDebug ? 'Masquer Debug' : 'Debug'}
              </button>
              <button
                onClick={testConnection}
                className="px-3 py-1 text-xs bg-white/20 rounded hover:bg-white/30 transition-colors"
              >
                Test
              </button>
              {onClose && (
                <button
                  onClick={handleClose}
                  className="px-3 py-1 text-xs bg-white/20 rounded hover:bg-white/30 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Zone des messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {!connected ? (
            <div className="text-center text-gray-500 py-8">
              <div className="text-lg mb-2">🔄</div>
              <div>Connexion au chat universel...</div>
              <div className="text-xs mt-2 text-gray-400">
                URL: {process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'}
              </div>
            </div>
          ) : !authenticated ? (
            <div className="text-center text-gray-500 py-8">
              <div className="text-lg mb-2">🔐</div>
              <div>Authentification en cours...</div>
              <div className="text-xs mt-2 text-gray-400">
                User: {currentUser.email}
              </div>
            </div>
          ) : !conversationStarted ? (
            <div className="text-center text-gray-500 py-8">
              <div className="text-lg mb-2">💬</div>
              <div>Préparation de la conversation universelle...</div>
              <div className="text-sm mt-2 space-y-1 text-gray-400">
                <div>Avec: {remoteUser.name || remoteUser.id}</div>
                <div>Conversations: {conversations.length}</div>
                <div>En ligne: {stats.onlineUsersCount}</div>
                <div>Expected ID: {createConversationId(currentUser.id, remoteUser.id)}</div>
                <div className="text-green-600 font-medium">🌟 Chat 100% Libre</div>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <div className="text-lg mb-2">💭</div>
              <div className="font-medium">Conversation universelle prête !</div>
              <div className="text-sm mt-2">
                Commencez à discuter avec {remoteUser.name || remoteUser.email} !
              </div>
              <div className="text-xs mt-4 space-y-1 text-gray-400">
                <div>Conversation: {activeConversation}</div>
                <div>En ligne: {isUserOnline(remoteUser.id) ? '🟢' : '🔴'}</div>
                <div className="text-green-600 font-medium">🚀 Aucun match requis !</div>
              </div>
            </div>
          ) : (
            messages.map((message, index) => {
              const isOwn = message.senderId === currentUser?.id;
              return (
                <div
                  key={message.id || index}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                      isOwn
                        ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white'
                        : 'bg-white text-gray-900 shadow-sm border'
                    }`}
                  >
                    <div className="break-words">{message.content}</div>
                    <div className={`text-xs mt-1 ${
                      isOwn ? 'text-white/70' : 'text-gray-500'
                    }`}>
                      {new Date(message.timestamp).toLocaleTimeString('fr-FR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Zone de saisie */}
        <div className="bg-white border-t p-4">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                connected && authenticated && conversationStarted 
                  ? `Écrivez à ${remoteUser.name || remoteUser.email}...`
                  : "Connexion en cours..."
              }
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:border-green-500 disabled:bg-gray-100"
              disabled={!connected || !authenticated || !conversationStarted}
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || !connected || !authenticated || !conversationStarted}
              className="px-6 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-full hover:from-green-600 hover:to-blue-600 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all"
            >
              ✈️
            </button>
          </div>
          
          <div className="text-xs text-gray-400 mt-2 flex justify-between">
            <span>
              Socket: {connected ? '🟢' : '🔴'} | 
              Auth: {authenticated ? '🟢' : '🔴'} | 
              Conv: {conversationStarted ? '🟢' : '🔴'} | 
              Messages: {messages.length} |
              En ligne: {stats.onlineUsersCount} |
              <span className="text-green-600 font-medium">Chat Libre</span>
            </span>
            <span>Debug: {debugLogs.length}</span>
          </div>
        </div>
      </div>

      {/* Panneau de debug */}
      {showDebug && (
        <div className="w-80 bg-gray-50 border-l flex flex-col">
          <div className="bg-gray-200 px-3 py-2 border-b flex justify-between items-center">
            <h3 className="font-semibold text-sm">Debug Chat Pur</h3>
            <button
              onClick={() => setDebugLogs([])}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Vider
            </button>
          </div>
          
          {/* Stats en temps réel */}
          <div className="bg-green-50 p-2 border-b text-xs space-y-1">
            <div><strong>Socket:</strong> {connected ? '✅' : '❌'}</div>
            <div><strong>Auth:</strong> {authenticated ? '✅' : '❌'}</div>
            <div><strong>Conversation:</strong> {activeConversation || '❌'}</div>
            <div><strong>Messages:</strong> {messages.length}</div>
            <div><strong>Conversations:</strong> {conversations.length}</div>
            <div><strong>En ligne:</strong> {stats.onlineUsersCount}</div>
            <div><strong>Target Online:</strong> {isUserOnline(remoteUser.id) ? '🟢' : '🔴'}</div>
            <div><strong>Expected ID:</strong> {createConversationId(currentUser.id, remoteUser.id)}</div>
            <div className="text-green-600 font-bold">🌟 CHAT PUR UNIVERSEL</div>
            <div className="text-xs text-green-600">Aucun système de match</div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {debugLogs.map((log, index) => (
              <div
                key={`${log.timestamp.getTime()}-${index}`}
                className={`text-xs p-2 rounded border-l-2 ${
                  log.type === 'error' ? 'bg-red-50 text-red-800 border-red-500' :
                  log.type === 'sent' ? 'bg-blue-50 text-blue-800 border-blue-500' :
                  log.type === 'received' ? 'bg-green-50 text-green-800 border-green-500' :
                  log.type === 'conversation' ? 'bg-purple-50 text-purple-800 border-purple-500' :
                  log.type === 'auth' ? 'bg-yellow-50 text-yellow-800 border-yellow-500' :
                  'bg-gray-50 text-gray-700 border-gray-300'
                }`}
              >
                <div className="font-semibold flex justify-between">
                  <span>[{log.type.toUpperCase()}]</span>
                  <span>
                    {log.timestamp.toLocaleTimeString('fr-FR', { 
                      hour: '2-digit', 
                      minute: '2-digit', 
                      second: '2-digit' 
                    })}
                  </span>
                </div>
                <div className="mt-1">{log.message}</div>
                {log.data && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs opacity-70">Détails</summary>
                    <pre className="mt-1 bg-white bg-opacity-50 p-1 rounded text-xs overflow-x-auto">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatSystem;