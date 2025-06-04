// src/hooks/useEnhancedSocket.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { offlineDB, offlineSyncService } from '@/lib/offline-storage';

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  timestamp: string;
  fromCurrentUser: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  clientId?: string;
  isOffline?: boolean;
  sender: any;
}

interface UseEnhancedSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  isAuthenticated: boolean;
  connectionError: string | null;
  isOnline: boolean;
  socketStats: any;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  offlineMessages: Message[];
  sendMessage: (data: any) => Promise<void>;
  userStatuses: Map<string, any>;
  typingUsers: Set<string>;
  requestUserStatus: (userId: string) => void;
  sendTypingIndicator: (userId: string, conversationId: string) => void;
  sendStoppedTyping: (userId: string, conversationId: string) => void;
  incomingCall: any;
  isInCall: boolean;
  setIncomingCall: (call: any) => void;
  setIsInCall: (inCall: boolean) => void;
  testConnection: () => void;
  syncMessages: () => Promise<void>;
  syncOfflineMessages: () => Promise<void>;
  getOfflineStats: () => any;
}

export function useEnhancedSocket(userId: string, userName?: string): UseEnhancedSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [socketStats, setSocketStats] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [offlineMessages, setOfflineMessages] = useState<Message[]>([]);
  const [userStatuses, setUserStatuses] = useState(new Map());
  const [typingUsers, setTypingUsers] = useState(new Set<string>());
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [isInCall, setIsInCall] = useState(false);

  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const conversationIdRef = useRef<string>('');

  // Initialiser la connexion Socket.IO
  useEffect(() => {
    const socketUrl = 'http://localhost:3000';
    
    const newSocket = io(socketUrl, {
      path: '/api/socketio',
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling']
    });

    // Gérer les événements de connexion
    newSocket.on('connect', () => {
      console.log('✅ Socket connecté');
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttempts.current = 0;
      
      // S'authentifier
      if (userId) {
        newSocket.emit('user:authenticate', { userId, userName });
      }
    });

    newSocket.on('authenticated', () => {
      console.log('✅ Authentifié');
      setIsAuthenticated(true);
      
      // Synchroniser après authentification
      syncOfflineMessages();
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Socket déconnecté:', reason);
      setIsConnected(false);
      setIsAuthenticated(false);
      
      if (reason === 'io server disconnect') {
        newSocket.connect();
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Erreur connexion:', error.message);
      setConnectionError(error.message);
      
      reconnectAttempts.current++;
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        setConnectionError('Impossible de se connecter au serveur de chat');
      }
    });

    // Gérer les messages
    newSocket.on('message:received', handleMessageReceived);
    newSocket.on('message:delivered', handleMessageDelivered);
    newSocket.on('message:read', handleMessageRead);
    
    // Gérer les statuts
    newSocket.on('user:status', handleUserStatus);
    newSocket.on('typing:update', handleTypingUpdate);
    
    // Gérer les appels
    newSocket.on('call:incoming', (data) => setIncomingCall(data));
    newSocket.on('call:ended', () => {
      setIncomingCall(null);
      setIsInCall(false);
    });

    // Stats serveur
    newSocket.on('server:stats', (stats) => setSocketStats(stats));

    setSocket(newSocket);
    
    if (isOnline) {
      newSocket.connect();
    }

    // Démarrer la synchronisation périodique
    offlineSyncService.startPeriodicSync();

    return () => {
      newSocket.removeAllListeners();
      newSocket.disconnect();
      offlineSyncService.stopPeriodicSync();
    };
  }, [userId, userName]);

  // Gérer le statut online/offline
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (socket && !socket.connected) {
        socket.connect();
      }
      offlineSyncService.triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [socket]);

  // Écouter les événements de synchronisation
  useEffect(() => {
    const handleSyncedMessages = (event: CustomEvent) => {
      const { conversationId, messages: syncedMessages } = event.detail;
      
      if (conversationId === conversationIdRef.current) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMessages = syncedMessages.filter((m: Message) => !existingIds.has(m.id));
          return [...prev, ...newMessages].sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        });
      }
    };

    window.addEventListener('offline-messages-synced', handleSyncedMessages as EventListener);
    
    return () => {
      window.removeEventListener('offline-messages-synced', handleSyncedMessages as EventListener);
    };
  }, []);

  // Handlers pour les messages
  const handleMessageReceived = useCallback((data: any) => {
    const newMessage: Message = {
      id: data.messageId || data.id,
      content: data.content,
      senderId: data.from,
      receiverId: data.to,
      timestamp: data.timestamp,
      fromCurrentUser: false,
      status: 'delivered',
      sender: data.sender
    };

    setMessages(prev => {
      const exists = prev.some(m => m.id === newMessage.id);
      if (exists) return prev;
      return [...prev, newMessage];
    });
  }, []);

  const handleMessageDelivered = useCallback((data: any) => {
    setMessages(prev => prev.map(msg => 
      msg.id === data.messageId || msg.clientId === data.clientMessageId
        ? { ...msg, status: 'delivered' }
        : msg
    ));
  }, []);

  const handleMessageRead = useCallback((data: any) => {
    setMessages(prev => prev.map(msg => 
      msg.id === data.messageId
        ? { ...msg, status: 'read' }
        : msg
    ));
  }, []);

  const handleUserStatus = useCallback((data: any) => {
    setUserStatuses(prev => new Map(prev).set(data.userId, data));
  }, []);

  const handleTypingUpdate = useCallback((data: any) => {
    if (data.isTyping) {
      setTypingUsers(prev => new Set(prev).add(data.userId));
    } else {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    }
  }, []);

  // Envoyer un message avec gestion offline
  const sendMessage = useCallback(async (data: any) => {
    const messageData = {
      ...data,
      clientId: data.clientId || `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: data.timestamp || new Date().toISOString()
    };

    if (!isOnline || !isConnected || !isAuthenticated) {
      // Sauvegarder en offline
      await offlineDB.saveOfflineMessage({
        content: messageData.content,
        senderId: userId,
        receiverId: messageData.receiverId,
        conversationId: messageData.conversationId || conversationIdRef.current,
        timestamp: messageData.timestamp,
        status: 'pending'
      });

      // Ajouter à l'UI comme message offline
      const offlineMessage: Message = {
        id: messageData.clientId,
        content: messageData.content,
        senderId: userId,
        receiverId: messageData.receiverId,
        timestamp: messageData.timestamp,
        fromCurrentUser: true,
        status: 'sending',
        clientId: messageData.clientId,
        isOffline: true,
        sender: { id: userId, name: userName }
      };

      setMessages(prev => [...prev, offlineMessage]);
      setOfflineMessages(prev => [...prev, offlineMessage]);

      throw new Error('Message sauvegardé hors ligne');
    }

    // Envoyer via Socket.IO si connecté
    socket!.emit('message:send', messageData);
    
    // Sauvegarder aussi via API pour la persistance
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });

      if (!response.ok) {
        throw new Error('Erreur API');
      }

      const result = await response.json();
      
      // Mettre à jour l'ID du message
      setMessages(prev => prev.map(msg => 
        msg.clientId === messageData.clientId
          ? { ...msg, id: result.message.id, status: 'sent' }
          : msg
      ));
    } catch (error) {
      // En cas d'échec API, le message reste en pending
      console.error('Erreur envoi API:', error);
      throw error;
    }
  }, [isOnline, isConnected, isAuthenticated, socket, userId, userName]);

  // Synchroniser les messages offline
  const syncOfflineMessages = useCallback(async () => {
    try {
      await offlineSyncService.triggerSync();
      
      // Mettre à jour les stats
      const pending = await offlineDB.getPendingMessages();
      setOfflineMessages(pending as any);
    } catch (error) {
      console.error('Erreur sync:', error);
    }
  }, []);

  // Synchroniser les messages depuis le serveur
  const syncMessages = useCallback(async () => {
    if (!conversationIdRef.current) return;

    try {
      const response = await fetch(`/api/chat?conversationId=${conversationIdRef.current}&limit=50`);
      const data = await response.json();
      
      if (data.success && data.messages) {
        setMessages(data.messages.map((msg: any) => ({
          ...msg,
          fromCurrentUser: msg.senderId === userId,
          status: msg.status || 'delivered'
        })));
      }
    } catch (error) {
      console.error('Erreur sync messages:', error);
    }
  }, [userId]);

  // Autres méthodes
  const requestUserStatus = useCallback((targetUserId: string) => {
    if (socket?.connected) {
      socket.emit('user:status:request', { userId: targetUserId });
    }
  }, [socket]);

  const sendTypingIndicator = useCallback((targetUserId: string, conversationId: string) => {
    if (socket?.connected) {
      socket.emit('typing:start', { to: targetUserId, conversationId });
    } else {
      // Sauvegarder en offline si nécessaire
      offlineDB.addToSyncQueue({
        type: 'typing',
        data: { to: targetUserId, conversationId, isTyping: true }
      });
    }
  }, [socket]);

  const sendStoppedTyping = useCallback((targetUserId: string, conversationId: string) => {
    if (socket?.connected) {
      socket.emit('typing:stop', { to: targetUserId, conversationId });
    }
  }, [socket]);

  const testConnection = useCallback(() => {
    if (socket?.connected) {
      socket.emit('test:connection', { timestamp: Date.now() });
    }
  }, [socket]);

  const getOfflineStats = useCallback(() => {
    const pending = offlineMessages.filter(m => m.status === 'sending').length;
    const failed = offlineMessages.filter(m => m.status === 'failed').length;
    
    return {
      total: offlineMessages.length,
      pending,
      failed,
      syncing: 0
    };
  }, [offlineMessages]);

  // Mettre à jour la conversationId de référence
  useEffect(() => {
    if (messages.length > 0) {
      const firstMessage = messages[0];
      conversationIdRef.current = `conv_${[firstMessage.senderId, firstMessage.receiverId].sort().join('_')}`;
    }
  }, [messages]);

  return {
    socket,
    isConnected,
    isAuthenticated,
    connectionError,
    isOnline,
    socketStats,
    messages,
    setMessages,
    offlineMessages,
    sendMessage,
    userStatuses,
    typingUsers,
    requestUserStatus,
    sendTypingIndicator,
    sendStoppedTyping,
    incomingCall,
    isInCall,
    setIncomingCall,
    setIsInCall,
    testConnection,
    syncMessages,
    syncOfflineMessages,
    getOfflineStats
  };
}