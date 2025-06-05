// src/hooks/useChat.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { MessageService } from '../lib/messageService';
import type { 
  ChatMessage, 
  FirebaseMessage, 
  PrismaMessage, 
  MessageStatus,
  TypingEvent,
  UserPresence 
} from '../types/chat';

interface UseChatReturn {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  markAsRead: () => Promise<void>;
  clearError: () => void;
  hasUnreadMessages: boolean;
  isTyping: boolean;
  setTyping: (typing: boolean) => void;
  otherUserTyping: boolean;
  otherUserPresence: UserPresence | null;
}

export function useChat(
  otherUserId: string,
  otherUserName?: string,
  otherUserImage?: string
): UseChatReturn {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [otherUserPresence, setOtherUserPresence] = useState<UserPresence | null>(null);

  // Refs pour éviter les re-renders
  const unsubscribeRefs = useRef<(() => void)[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const clearError = useCallback(() => setError(null), []);

  // Charger l'historique depuis Prisma
  const loadHistory = useCallback(async () => {
    if (!session?.user?.id || !otherUserId) return;

    try {
      setError(null);
      const response = await fetch(
        `/api/messages?conversationWith=${otherUserId}&limit=50`
      );
      
      if (!response.ok) throw new Error('Erreur chargement');
      
      const history: PrismaMessage[] = await response.json();
      const chatMessages: ChatMessage[] = history.map(msg => ({
        id: msg.id,
        content: msg.content,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        createdAt: new Date(msg.createdAt),
        clientId: msg.clientId || `${msg.id}-${Date.now()}`,
        status: msg.status as MessageStatus,
        readAt: msg.readAt ? new Date(msg.readAt) : null,
        edited: !!msg.editedAt,
        sender: msg.sender
      }));
      
      setMessages(chatMessages);
      
      // Calculer messages non lus
      const unreadCount = chatMessages.filter(
        msg => msg.senderId === otherUserId && !msg.readAt
      ).length;
      setHasUnreadMessages(unreadCount > 0);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    }
  }, [session?.user?.id, otherUserId]);

  // Envoyer un message
  const sendMessage = useCallback(async (content: string) => {
    if (!session?.user?.id || !content.trim()) return;

    const clientId = `${Date.now()}-${Math.random()}`;
    const tempMessage: ChatMessage = {
      id: clientId,
      content: content.trim(),
      senderId: session.user.id,
      receiverId: otherUserId,
      createdAt: new Date(),
      clientId,
      status: 'SENDING',
      sender: {
        id: session.user.id,
        name: session.user.name,
        image: session.user.image
      }
    };

    setMessages(prev => [...prev, tempMessage]);
    setError(null);

    try {
      await MessageService.sendMessage(
        session.user.id,
        otherUserId,
        content.trim(),
        clientId
      );
    } catch (error) {
      setMessages(prev => 
        prev.map(m => 
          m.clientId === clientId 
            ? { ...m, status: 'FAILED' as MessageStatus }
            : m
        )
      );
      setError('Erreur envoi message');
    }
  }, [session?.user?.id, otherUserId]);

  // Marquer comme lu
  const markAsRead = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const unreadMessageIds = messages
        .filter(msg => msg.senderId === otherUserId && !msg.readAt)
        .map(msg => msg.id);

      if (unreadMessageIds.length > 0) {
        await MessageService.markAsRead(session.user.id, otherUserId, unreadMessageIds);
        setHasUnreadMessages(false);
      }
    } catch (error) {
      console.error('Erreur marquer comme lu:', error);
    }
  }, [session?.user?.id, otherUserId, messages]);

  // Gestion du typing
  const setTyping = useCallback((typing: boolean) => {
    if (!session?.user?.id) return;

    setIsTyping(typing);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    MessageService.setTypingStatus(
      session.user.id,
      otherUserId,
      session.user.name || 'Utilisateur',
      typing
    );

    if (typing) {
      // Arrêter automatiquement après 3 secondes
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
      }, 3000);
    }
  }, [session?.user?.id, otherUserId]);

  // Mise à jour de la présence
  useEffect(() => {
    if (!session?.user?.id) return;

    // Marquer comme en ligne
    MessageService.updatePresence(session.user.id, true);

    // Nettoyer à la déconnexion
    const handleBeforeUnload = () => {
      MessageService.updatePresence(session.user.id!, false);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      MessageService.updatePresence(session.user.id!, false);
    };
  }, [session?.user?.id]);

  // Écouter les messages, typing et présence
  useEffect(() => {
    if (!session?.user?.id || !otherUserId) return;

    // Charger l'historique
    loadHistory();

    // Écouter les nouveaux messages Firebase
    const unsubscribeMessages = MessageService.subscribeToMessages(
      session.user.id,
      otherUserId,
      (firebaseMessages: FirebaseMessage[]) => {
        setMessages(prev => {
          const combined = [...prev];
          
          firebaseMessages.forEach(fbMsg => {
            const existingIndex = combined.findIndex(m => m.clientId === fbMsg.clientId);
            
            if (existingIndex >= 0) {
              // Mettre à jour le message existant
              combined[existingIndex] = {
                ...combined[existingIndex],
                id: fbMsg.id,
                status: fbMsg.status,
                createdAt: fbMsg.timestamp || combined[existingIndex].createdAt,
                edited: fbMsg.edited || false
              };
            } else {
              // Nouveau message
              const chatMessage: ChatMessage = {
                id: fbMsg.id,
                content: fbMsg.content,
                senderId: fbMsg.senderId,
                receiverId: fbMsg.receiverId,
                createdAt: fbMsg.timestamp || new Date(),
                clientId: fbMsg.clientId,
                status: fbMsg.status,
                edited: fbMsg.edited || false,
                sender: { 
                  id: fbMsg.senderId,
                  name: fbMsg.senderId === session.user.id 
                    ? session.user.name 
                    : otherUserName || 'Utilisateur',
                  image: fbMsg.senderId === session.user.id 
                    ? session.user.image 
                    : otherUserImage || null
                }
              };
              combined.push(chatMessage);
            }
          });
          
          return combined.sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });
      }
    );

    unsubscribeRefs.current.push(unsubscribeMessages);

    // Écouter le typing
    const unsubscribeTyping = MessageService.subscribeToTyping(
      session.user.id,
      otherUserId,
      (typingUsers: TypingEvent[]) => {
        const otherUserTypingEvent = typingUsers.find(
          event => event.userId === otherUserId
        );
        setOtherUserTyping(!!otherUserTypingEvent);
      }
    );
    unsubscribeRefs.current.push(unsubscribeTyping);

    // Écouter la présence
    const unsubscribePresence = MessageService.subscribeToPresence(
      otherUserId,
      setOtherUserPresence
    );
    unsubscribeRefs.current.push(unsubscribePresence);

    // Marquer comme lu
    const timer = setTimeout(markAsRead, 1000);

    return () => {
      clearTimeout(timer);
      unsubscribeRefs.current.forEach(unsubscribe => unsubscribe());
      unsubscribeRefs.current = [];
    };
  }, [
    session?.user?.id, 
    otherUserId, 
    loadHistory,
    markAsRead,
    otherUserName,
    otherUserImage
  ]);

  // Nettoyer le timeout du typing
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    messages,
    loading,
    error,
    sendMessage,
    markAsRead,
    clearError,
    hasUnreadMessages,
    isTyping,
    setTyping,
    otherUserTyping,
    otherUserPresence
  };
}