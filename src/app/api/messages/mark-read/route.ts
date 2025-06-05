'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { MessageService } from '../lib/messageService';
import type { ChatMessage, PrismaMessage, FirebaseMessage, MessageStatus } from '../types/chat';

interface ChatProps {
  otherUserId: string;
  otherUserName: string;
  otherUserImage: string;
}

const Chat: React.FC<ChatProps> = ({ 
  otherUserId, 
  otherUserName, 
  otherUserImage 
}) => {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!session?.user?.id || !otherUserId) return;

    // Charger l'historique depuis Prisma
    loadMessageHistory();

    // Écouter les nouveaux messages via Firebase
    const unsubscribe = MessageService.subscribeToMessages(
      session.user.id,
      otherUserId,
      (firebaseMessages: FirebaseMessage[]) => {
        // Fusionner avec les messages existants
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
                    : otherUserName,
                  image: fbMsg.senderId === session.user.id 
                    ? session.user.image 
                    : otherUserImage
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

    // Marquer comme lu quand on ouvre le chat
    MessageService.markConversationAsRead(session.user.id, otherUserId);

    // Détecter la connexion
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [session?.user?.id, otherUserId, otherUserName, otherUserImage]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessageHistory = async (): Promise<void> => {
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
  };

  const sendMessage = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    if (!newMessage.trim() || !session?.user?.id) return;

    const clientId = `${Date.now()}-${Math.random()}`;
    const tempMessage: ChatMessage = {
      id: clientId,
      content: newMessage.trim(),
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
    setNewMessage('');
    setLoading(true);

    try {
      await MessageService.sendMessage(
        session.user.id,
        otherUserId,
        newMessage.trim(),
        clientId
      );
    } catch (error) {
      console.error('Erreur envoi:', error);
      // Marquer le message comme échoué
      setMessages(prev => 
        prev.map(m => 
          m.clientId === clientId 
            ? { ...m, status: 'FAILED' as MessageStatus }
            : m
        )
      );
    }
    setLoading(false);
  };

  const getStatusIcon = (status: MessageStatus): string => {
    switch (status) {
      case 'SENDING': return '📤';
      case 'SENT': return '✓';
      case 'DELIVERED': return '✓✓';
      case 'READ': return '✓✓';
      case 'FAILED': return '❌';
      default: return '';
    }
  };

  const getStatusColor = (status: MessageStatus): string => {
    switch (status) {
      case 'READ': return '#4CAF50';
      case 'DELIVERED': return '#2196F3';
      case 'SENT': return '#9E9E9E';
      case 'FAILED': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  if (!session) {
    return (
      <div className="auth-required">
        <p>Connectez-vous pour chatter</p>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <img 
          src={otherUserImage || '/default-avatar.png'} 
          alt={otherUserName} 
          className="avatar" 
        />
        <div className="user-info">
          <h3>{otherUserName}</h3>
          <span className={`status ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? '🟢 En ligne' : '🔴 Hors ligne'}
          </span>
        </div>
      </div>

      <div className="messages">
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>Aucun message pour le moment</p>
            <p>Commencez la conversation ! 👋</p>
          </div>
        ) : (
          messages.map((message) => (
            <div 
              key={message.id} 
              className={`message ${message.senderId === session.user.id ? 'own' : 'other'}`}
            >
              <div className="message-content">
                {message.content}
                {message.senderId === session.user.id && (
                  <span 
                    className="status" 
                    title={message.status}
                    style={{ color: getStatusColor(message.status) }}
                  >
                    {getStatusIcon(message.status)}
                  </span>
                )}
              </div>
              <div className="message-time">
                {new Date(message.createdAt).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="message-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
            setNewMessage(e.target.value)
          }
          placeholder="Écrivez votre message..."
          disabled={loading || !isOnline}
          maxLength={1000}
        />
        <button 
          type="submit" 
          disabled={loading || !newMessage.trim() || !isOnline}
          title={!isOnline ? 'Connexion requise' : ''}
        >
          {loading ? '⏳' : '📤'}
        </button>
      </form>

      <style jsx>{`
        .chat-container {
          max-width: 600px;
          height: 600px;
          border: 1px solid #e1e5e9;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          background: white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .chat-header {
          display: flex;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #e1e5e9;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          margin-right: 1rem;
          object-fit: cover;
          border: 2px solid rgba(255, 255, 255, 0.3);
        }

        .user-info h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .status {
          font-size: 0.8rem;
          opacity: 0.9;
        }

        .messages {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          background: #f8f9fa;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #6c757d;
          text-align: center;
        }

        .message {
          margin-bottom: 1rem;
          max-width: 75%;
          animation: fadeIn 0.3s ease-in;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .message.own {
          margin-left: auto;
        }

        .message-content {
          padding: 0.75rem 1rem;
          border-radius: 18px;
          word-wrap: break-word;
          position: relative;
          display: flex;
          align-items: flex-end;
          gap: 0.5rem;
          line-height: 1.4;
        }

        .message.own .message-content {
          background: linear-gradient(135deg, #007bff, #0056b3);
          color: white;
          border-bottom-right-radius: 6px;
        }

        .message.other .message-content {
          background: white;
          border: 1px solid #e1e5e9;
          color: #333;
          border-bottom-left-radius: 6px;
        }

        .message-time {
          font-size: 0.7rem;
          color: #6c757d;
          margin-top: 0.25rem;
          text-align: right;
        }

        .message.other .message-time {
          text-align: left;
        }

        .status {
          font-size: 0.7rem;
          margin-left: auto;
          flex-shrink: 0;
        }

        .message-form {
          display: flex;
          padding: 1rem;
          border-top: 1px solid #e1e5e9;
          background: white;
          gap: 0.5rem;
        }

        .message-form input {
          flex: 1;
          padding: 0.75rem 1rem;
          border: 1px solid #e1e5e9;
          border-radius: 25px;
          outline: none;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .message-form input:focus {
          border-color: #007bff;
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }

        .message-form input:disabled {
          background: #f8f9fa;
          cursor: not-allowed;
        }

        .message-form button {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #007bff, #0056b3);
          color: white;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          font-size: 1.2rem;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .message-form button:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
        }

        .message-form button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .auth-required {
          padding: 2rem;
          text-align: center;
          color: #6c757d;
          font-style: italic;
        }

        /* Scrollbar personnalisée */
        .messages::-webkit-scrollbar {
          width: 6px;
        }

        .messages::-webkit-scrollbar-track {
          background: #f1f1f1;
        }

        .messages::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }

        .messages::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}</style>
    </div>
  );
};

export default Chat;