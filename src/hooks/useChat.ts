// src/hooks/useChat.ts - Hook universel pour le chat
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';

// Types
interface User {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  online?: boolean;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  conversationId: string;
  type?: string;
}

interface Conversation {
  id: string;
  with: User;
  lastMessage?: Message;
  lastActivity: string;
  unreadCount: number;
}

interface ChatStats {
  onlineUsersCount: number;
  conversationsCount: number;
  totalMessages: number;
}

export const useChat = () => {
  const { data: session, status } = useSession();
  
  // Socket et connexion
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  
  // Données du chat
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Map<string, Message[]>>(new Map());
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  
  // État et erreurs
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ChatStats>({
    onlineUsersCount: 0,
    conversationsCount: 0,
    totalMessages: 0
  });
  
  // Refs pour éviter les doubles connexions
  const socketRef = useRef<Socket | null>(null);
  const isConnectingRef = useRef(false);

  // Configuration du socket
  const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

  // Connexion au socket
  useEffect(() => {
    if (status === 'loading' || !session?.user?.email || isConnectingRef.current) {
      return;
    }

    if (socketRef.current?.connected) {
      console.log('🔄 Socket déjà connecté');
      return;
    }

    console.log('🔌 Tentative de connexion Socket.io...');
    isConnectingRef.current = true;

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      timeout: 5000,
      forceNew: true
    });

    // Événements de connexion
    newSocket.on('connect', () => {
      console.log('✅ Socket connecté:', newSocket.id);
      setConnected(true);
      setError(null);
      
      // Authentification automatique
      const userData = {
        userId: session.user.email,
        userName: session.user.name || session.user.email?.split('@')[0],
        avatar: session.user.image || null
      };
      
      console.log('🔐 Envoi authentification:', userData);
      newSocket.emit('authenticate', userData);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket déconnecté');
      setConnected(false);
      setAuthenticated(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Erreur connexion Socket:', error);
      setError(`Erreur connexion: ${error.message}`);
      setConnected(false);
      isConnectingRef.current = false;
    });

    // Événements d'authentification
    newSocket.on('authenticated', (data) => {
      console.log('✅ Authentifié:', data);
      setAuthenticated(true);
      setError(null);
      
      // Récupérer les données initiales
      newSocket.emit('get_conversations');
      newSocket.emit('get_online_users');
    });

    // Événements de conversation
    newSocket.on('conversation_ready', (data) => {
      console.log('✅ Conversation prête:', data);
      setActiveConversation(data.conversationId);
      
      if (data.messages && data.messages.length > 0) {
        setMessages(prev => {
          const newMessages = new Map(prev);
          newMessages.set(data.conversationId, data.messages);
          return newMessages;
        });
      }
    });

    newSocket.on('conversation_started', (data) => {
      console.log('✅ Conversation démarrée:', data);
      setActiveConversation(data.conversationId);
      
      if (data.messages && data.messages.length > 0) {
        setMessages(prev => {
          const newMessages = new Map(prev);
          newMessages.set(data.conversationId, data.messages);
          return newMessages;
        });
      }
    });

    // Événements de messages
    newSocket.on('new_message', (data) => {
      console.log('📨 Nouveau message:', data);
      
      const { message, conversationId } = data;
      
      setMessages(prev => {
        const newMessages = new Map(prev);
        const existing = newMessages.get(conversationId) || [];
        newMessages.set(conversationId, [...existing, message]);
        return newMessages;
      });
    });

    // Événements d'utilisateurs
    newSocket.on('online_users', (users) => {
      console.log('👥 Utilisateurs en ligne:', users);
      setOnlineUsers(users);
      setStats(prev => ({ ...prev, onlineUsersCount: users.length }));
    });

    newSocket.on('user_online', (user) => {
      console.log('✅ Utilisateur connecté:', user);
      setOnlineUsers(prev => {
        const filtered = prev.filter(u => u.id !== user.id);
        return [...filtered, { ...user, online: true }];
      });
    });

    newSocket.on('user_offline', (data) => {
      console.log('❌ Utilisateur déconnecté:', data.userId);
      setOnlineUsers(prev => prev.filter(u => u.id !== data.userId));
    });

    // Événements de conversations
    newSocket.on('conversations_list', (conversations) => {
      console.log('📋 Liste conversations:', conversations);
      setConversations(conversations);
      setStats(prev => ({ ...prev, conversationsCount: conversations.length }));
    });

    // Gestion des erreurs
    newSocket.on('error', (error) => {
      console.error('❌ Erreur serveur:', error);
      setError(error.message || 'Erreur inconnue');
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
    isConnectingRef.current = false;

    // Cleanup
    return () => {
      console.log('🧹 Nettoyage socket');
      if (newSocket) {
        newSocket.removeAllListeners();
        newSocket.disconnect();
      }
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
      setAuthenticated(false);
      isConnectingRef.current = false;
    };

  }, [session, status, SOCKET_URL]);

  // Fonctions du chat
  const startConversation = useCallback((targetUserId: string) => {
    if (!socket || !connected || !authenticated) {
      console.warn('⚠️ Impossible de démarrer conversation: socket non prêt');
      return;
    }

    console.log('💬 Démarrage conversation avec:', targetUserId);
    socket.emit('start_conversation', { targetUserId });
  }, [socket, connected, authenticated]);

  const sendMessage = useCallback((conversationId: string, content: string) => {
    if (!socket || !connected || !authenticated) {
      console.warn('⚠️ Impossible d\'envoyer message: socket non prêt');
      return;
    }

    console.log('📤 Envoi message:', { conversationId, content });
    socket.emit('send_message', {
      conversationId,
      content,
      type: 'text'
    });
  }, [socket, connected, authenticated]);

  const openConversation = useCallback((conversationId: string) => {
    console.log('📂 Ouverture conversation:', conversationId);
    setActiveConversation(conversationId);
  }, []);

  const closeConversation = useCallback(() => {
    console.log('📚 Fermeture conversation');
    setActiveConversation(null);
  }, []);

  const getActiveMessages = useCallback(() => {
    if (!activeConversation) return [];
    return messages.get(activeConversation) || [];
  }, [activeConversation, messages]);

  const isUserOnline = useCallback((userId: string) => {
    return onlineUsers.some(user => user.id === userId && user.online !== false);
  }, [onlineUsers]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Debug info
  useEffect(() => {
    const totalMessages = Array.from(messages.values()).reduce(
      (total, msgs) => total + msgs.length, 
      0
    );
    setStats(prev => ({ ...prev, totalMessages }));
  }, [messages]);

  return {
    // État de connexion
    connected,
    authenticated,
    error,
    
    // Données
    conversations,
    activeConversation,
    onlineUsers,
    stats,
    
    // Actions
    startConversation,
    sendMessage,
    openConversation,
    closeConversation,
    getActiveMessages,
    isUserOnline,
    clearError,
    
    // Debug
    socket: socketRef.current
  };
};