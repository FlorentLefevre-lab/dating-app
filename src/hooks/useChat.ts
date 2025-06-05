import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { MessageService } from '../lib/messageService';
import type { ChatMessage, FirebaseMessage, PrismaMessage, MessageStatus } from '../types/chat';

export function useChat(otherUserId: string) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(true);

  // Charger l'historique
  const loadHistory = useCallback(async () => {
    if (!session?.user?.id || !otherUserId) return;

    try {
      const response = await fetch(`/api/messages?conversationWith=${otherUserId}`);
      if (response.ok) {
        const history: PrismaMessage[] = await response.json();
        const chatMessages: ChatMessage[] = history.map(msg => ({
          id: msg.id,
          content: msg.content,
          senderId: msg.senderId,
          receiverId: msg.receiverId,
          createdAt: msg.createdAt,
          clientId: msg.clientId || `${msg.id}-${Date.now()}`,
          status: msg.status as MessageStatus,
          readAt: msg.readAt,
          sender: msg.sender
        }));
        setMessages(chatMessages);
      }
    } catch (error) {
      console.error('Erreur chargement historique:', error);
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
    setLoading(true);

    try {
      await MessageService.sendMessage(
        session.user.id,
        otherUserId,
        content.trim(),
        clientId
      );
    } catch (error) {
      console.error('Erreur envoi:', error);
      setMessages(prev => 
        prev.map(m => 
          m.clientId === clientId 
            ? { ...m, status: 'FAILED' as MessageStatus }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, otherUserId]);

  // Marquer comme lu
  const markAsRead = useCallback(() => {
    if (session?.user?.id) {
      MessageService.markConversationAsRead(session.user.id, otherUserId);
    }
  }, [session?.user?.id, otherUserId]);

  // Écouter les messages en temps réel
  useEffect(() => {
    if (!session?.user?.id || !otherUserId) return;

    loadHistory();

    const unsubscribe = MessageService.subscribeToMessages(
      session.user.id,
      otherUserId,
      (firebaseMessages: FirebaseMessage[]) => {
        setMessages(prev => {
          const combined = [...prev];
          
          firebaseMessages.forEach(fbMsg => {
            if (!combined.find(m => m.clientId === fbMsg.clientId)) {
              const chatMessage: ChatMessage = {
                id: fbMsg.id,
                content: fbMsg.content,
                senderId: fbMsg.senderId,
                receiverId: fbMsg.receiverId,
                createdAt: fbMsg.timestamp || new Date(),
                clientId: fbMsg.clientId,
                status: fbMsg.status,
                sender: { 
                  id: fbMsg.senderId,
                  name: fbMsg.senderId === session.user.id 
                    ? session.user.name 
                    : 'Autre utilisateur',
                  image: fbMsg.senderId === session.user.id 
                    ? session.user.image 
                    : null
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

    markAsRead();

    // Gérer la connexion
    const handleOnline = () => setConnected(true);
    const handleOffline = () => setConnected(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [session?.user?.id, otherUserId, loadHistory, markAsRead]);

  return {
    messages,
    loading,
    connected,
    sendMessage,
    markAsRead
  };
}