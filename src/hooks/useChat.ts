// src/hooks/useChat.ts - VERSION CORRIGÉE
import { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  timestamp: Date;
  createdAt: string;
  readAt?: string | null;
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  clientMessageId?: string;
  isDuplicate?: boolean;
}

interface UseChatProps {
  conversationId: string;
  currentUserId: string;
  targetUserId: string;
  socket?: Socket | null;
}

interface ChatState {
  messages: Message[];
  loading: boolean;
  error: string | null;
  hasMoreMessages: boolean;
  isLoadingMore: boolean;
  lastSyncTimestamp: string | null;
  unreadCount: number;
}

export function useChat({ conversationId, currentUserId, targetUserId, socket }: UseChatProps) {
  const [state, setState] = useState<ChatState>({
    messages: [],
    loading: true,
    error: null,
    hasMoreMessages: true,
    isLoadingMore: false,
    lastSyncTimestamp: null,
    unreadCount: 0
  });

  const lastMessageIdRef = useRef<string | null>(null);
  const retryQueueRef = useRef<Set<string>>(new Set());
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Charger l'historique initial
  const loadInitialHistory = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const response = await fetch(`/api/chat?conversationId=${conversationId}&limit=50`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur de chargement');
      }

      const messages: Message[] = data.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.createdAt),
        status: msg.status || 'delivered'
      }));

      setState(prev => ({
        ...prev,
        messages,
        loading: false,
        hasMoreMessages: data.pagination?.hasMore || false,
        lastSyncTimestamp: data.synchronization?.serverTimestamp || new Date().toISOString(),
        unreadCount: data.conversation?.unreadCount || 0
      }));

      // Mémoriser le dernier message pour la pagination
      if (messages.length > 0) {
        lastMessageIdRef.current = data.pagination?.oldestMessageId || messages[0].id;
      }

      console.log('📚 Historique initial chargé:', messages.length, 'messages');

    } catch (error: any) {
      console.error('❌ Erreur chargement historique:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  }, [conversationId]);

  // Charger plus de messages (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (state.isLoadingMore || !state.hasMoreMessages || !lastMessageIdRef.current) {
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoadingMore: true }));

      const response = await fetch(
        `/api/chat?conversationId=${conversationId}&lastMessageId=${lastMessageIdRef.current}&limit=50`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur de chargement');
      }

      const newMessages: Message[] = data.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.createdAt),
        status: msg.status || 'delivered'
      }));

      setState(prev => ({
        ...prev,
        messages: [...newMessages, ...prev.messages], // Ajouter au début
        isLoadingMore: false,
        hasMoreMessages: data.pagination?.hasMore || false
      }));

      // Mettre à jour la référence pour la prochaine pagination
      if (newMessages.length > 0) {
        lastMessageIdRef.current = data.pagination?.oldestMessageId || newMessages[0].id;
      }

      console.log('📚 Messages supplémentaires chargés:', newMessages.length);

    } catch (error: any) {
      console.error('❌ Erreur chargement messages supplémentaires:', error);
      setState(prev => ({ ...prev, isLoadingMore: false }));
    }
  }, [conversationId, state.isLoadingMore, state.hasMoreMessages]);

  // Synchroniser les messages manqués
  const syncMissedMessages = useCallback(async () => {
    if (!state.lastSyncTimestamp) return;

    try {
      const response = await fetch('/api/chat', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lastSyncTimestamp: state.lastSyncTimestamp,
          conversationId
        })
      });

      const data = await response.json();

      if (response.ok && data.missedMessages?.length > 0) {
        const newMessages: Message[] = data.missedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.createdAt),
          status: 'delivered'
        }));

        setState(prev => {
          // Éviter les doublons
          const existingIds = new Set(prev.messages.map(m => m.id));
          const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id));

          return {
            ...prev,
            messages: [...prev.messages, ...uniqueNewMessages],
            lastSyncTimestamp: data.syncTimestamp
          };
        });

        console.log('🔄 Messages manqués synchronisés:', newMessages.length);
      }

    } catch (error) {
      console.error('❌ Erreur synchronisation:', error);
    }
  }, [state.lastSyncTimestamp, conversationId]);

  // Envoyer un message avec retry et persistance
  const sendMessage = useCallback(async (content: string): Promise<string> => {
    if (!content.trim()) {
      throw new Error('Message vide');
    }

    const clientMessageId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date();

    // Ajouter immédiatement le message à l'interface (optimistic update)
    const tempMessage: Message = {
      id: clientMessageId,
      content: content.trim(),
      senderId: currentUserId,
      receiverId: targetUserId,
      timestamp,
      createdAt: timestamp.toISOString(),
      status: 'pending',
      clientMessageId
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, tempMessage]
    }));

    // Fonction de retry pour l'envoi
    const attemptSend = async (retryCount = 0): Promise<string> => {
      try {
        // Envoyer via API REST pour la persistance
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: content.trim(),
            receiverId: targetUserId,
            conversationId,
            clientMessageId,
            timestamp: timestamp.toISOString()
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erreur envoi message');
        }

        // Mettre à jour le message avec l'ID du serveur
        setState(prev => ({
          ...prev,
          messages: prev.messages.map(msg => 
            msg.clientMessageId === clientMessageId
              ? {
                  ...msg,
                  id: data.message.id,
                  status: data.message.isDuplicate ? 'delivered' : 'sent',
                  createdAt: data.message.createdAt
                }
              : msg
          )
        }));

        // Envoyer aussi via Socket.IO pour la notification temps réel (si disponible)
        if (socket?.connected) {
          socket.emit('message:send', {
            messageId: data.message.id,
            conversationId,
            content: content.trim(),
            to: targetUserId,
            from: currentUserId,
            timestamp: data.message.createdAt
          });
        }

        // Retirer de la queue de retry
        retryQueueRef.current.delete(clientMessageId);

        console.log('✅ Message envoyé avec succès:', data.message.id);
        return data.message.id;

      } catch (error: any) {
        console.error(`❌ Tentative ${retryCount + 1} échouée:`, error);

        if (retryCount < 3) {
          // Retry avec backoff exponentiel
          const delay = Math.pow(2, retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          return attemptSend(retryCount + 1);
        } else {
          // Échec définitif
          setState(prev => ({
            ...prev,
            messages: prev.messages.map(msg => 
              msg.clientMessageId === clientMessageId
                ? { ...msg, status: 'failed' }
                : msg
            )
          }));

          // Ajouter à la queue de retry pour plus tard
          retryQueueRef.current.add(clientMessageId);
          throw error;
        }
      }
    };

    return attemptSend();
  }, [currentUserId, targetUserId, conversationId, socket]);

  // Retry des messages échoués
  const retryFailedMessages = useCallback(async () => {
    const failedMessages = state.messages.filter(msg => msg.status === 'failed');
    
    for (const message of failedMessages) {
      if (message.clientMessageId) {
        try {
          await sendMessage(message.content);
        } catch (error) {
          console.error('❌ Retry échoué pour message:', message.id);
        }
      }
    }
  }, [state.messages, sendMessage]);

  // Gérer les événements Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleMessageReceived = (data: any) => {
      console.log('📥 Message reçu via Socket.IO:', data);
      
      if (data.conversationId === conversationId) {
        const newMessage: Message = {
          id: data.messageId || data.id,
          content: data.content,
          senderId: data.from,
          receiverId: data.to,
          timestamp: new Date(data.timestamp),
          createdAt: data.timestamp,
          status: 'delivered'
        };

        setState(prev => {
          // Éviter les doublons
          const exists = prev.messages.some(m => m.id === newMessage.id);
          if (exists) return prev;

          return {
            ...prev,
            messages: [...prev.messages, newMessage],
            unreadCount: newMessage.senderId !== currentUserId ? prev.unreadCount + 1 : prev.unreadCount
          };
        });
      }
    };

    const handleMessageDelivered = (data: any) => {
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, status: 'delivered' }
            : msg
        )
      }));
    };

    const handleMessageRead = (data: any) => {
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, status: 'read', readAt: data.readAt }
            : msg
        )
      }));
    };

    socket.on('message:received', handleMessageReceived);
    socket.on('message:delivered', handleMessageDelivered);
    socket.on('message:read', handleMessageRead);

    return () => {
      socket.off('message:received', handleMessageReceived);
      socket.off('message:delivered', handleMessageDelivered);
      socket.off('message:read', handleMessageRead);
    };
  }, [socket, conversationId, currentUserId]);

  // Synchronisation périodique
  useEffect(() => {
    // Synchroniser au chargement initial
    loadInitialHistory();

    // Synchronisation périodique toutes les 30 secondes
    syncIntervalRef.current = setInterval(syncMissedMessages, 30000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [loadInitialHistory, syncMissedMessages]);

  // Synchronisation lors de la reconnexion
  useEffect(() => {
    if (socket?.connected && state.lastSyncTimestamp) {
      syncMissedMessages();
    }
  }, [socket?.connected, syncMissedMessages, state.lastSyncTimestamp]);

  // Marquer les messages comme lus
  const markAsRead = useCallback(async () => {
    const unreadMessages = state.messages.filter(
      msg => msg.senderId !== currentUserId && msg.status !== 'read'
    );

    if (unreadMessages.length === 0) return;

    // Marquer immédiatement dans l'interface
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg => 
        msg.senderId !== currentUserId 
          ? { ...msg, status: 'read', readAt: new Date().toISOString() }
          : msg
      ),
      unreadCount: 0
    }));

    // Note: Ici vous pourriez ajouter un appel API pour marquer comme lu côté serveur
    // et notifier l'expéditeur via Socket.IO
  }, [state.messages, currentUserId]);

  return {
    messages: state.messages,
    loading: state.loading,
    error: state.error,
    hasMoreMessages: state.hasMoreMessages,
    isLoadingMore: state.isLoadingMore,
    unreadCount: state.unreadCount,
    sendMessage,
    loadMoreMessages,
    retryFailedMessages,
    syncMissedMessages,
    markAsRead,
    isConnected: socket?.connected || false
  };
}