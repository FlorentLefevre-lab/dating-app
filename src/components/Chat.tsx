// src/components/Chat.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useChat } from '../hooks/useChat';
import type { ChatUser } from '../types/chat';

interface ChatProps {
  otherUser: ChatUser;
  className?: string;
}

const Chat: React.FC<ChatProps> = ({ otherUser, className = '' }) => {
  const { data: session } = useSession();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
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
  } = useChat(
    otherUser.id,
    otherUser.name || 'Utilisateur',
    otherUser.image || '/default-avatar.png'
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Gestion du typing
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (newMessage.trim()) {
      setTyping(true);
      timeout = setTimeout(() => setTyping(false), 1000);
    } else {
      setTyping(false);
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [newMessage, setTyping]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    await sendMessage(newMessage);
    setNewMessage('');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENDING': return '⏳';
      case 'SENT': return '✓';
      case 'DELIVERED': return '✓✓';
      case 'READ': return '✓✓';
      case 'FAILED': return '❌';
      default: return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'READ': return '#4CAF50';
      case 'DELIVERED': return '#2196F3';
      case 'SENT': return '#9E9E9E';
      case 'FAILED': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getPresenceText = () => {
    if (!otherUserPresence) return 'Statut inconnu';
    
    if (otherUserPresence.isOnline) {
      return '🟢 En ligne';
    } else {
      const diff = Date.now() - otherUserPresence.lastSeen.getTime();
      const minutes = Math.floor(diff / (1000 * 60));
      
      if (minutes < 1) return 'Vu à l\'instant';
      if (minutes < 60) return `Vu il y a ${minutes}min`;
      
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `Vu il y a ${hours}h`;
      
      const days = Math.floor(hours / 24);
      return `Vu il y a ${days}j`;
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Connectez-vous pour chatter</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <img
          src={otherUser.image || '/default-avatar.png'}
          alt={otherUser.name || 'Utilisateur'}
          className="w-12 h-12 rounded-full object-cover border-2 border-white/30"
        />
        <div className="ml-3 flex-1">
          <h3 className="font-semibold text-lg">
            {otherUser.name || 'Utilisateur'}
          </h3>
          <p className="text-sm opacity-90">
            {getPresenceText()}
          </p>
        </div>
        {hasUnreadMessages && (
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
        )}
      </div>

      {/* Erreur */}
      {error && (
        <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 flex justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="font-bold">×</button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-2">Aucun message pour le moment</p>
            <p className="text-gray-400">Commencez la conversation ! 👋</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.senderId === session.user.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg relative ${
                  message.senderId === session.user.id
                    ? 'bg-blue-500 text-white rounded-br-sm'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                }`}
              >
                <p className="break-words">
                  {message.content}
                  {message.edited && (
                    <span className="text-xs opacity-70 ml-2">(modifié)</span>
                  )}
                </p>
                
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs opacity-70">
                    {formatTime(message.createdAt)}
                  </span>
                  
                  {message.senderId === session.user.id && (
                    <span
                      className="text-xs ml-2"
                      style={{ color: getStatusColor(message.status) }}
                      title={message.status}
                    >
                      {getStatusIcon(message.status)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Indicateur de frappe */}
        {otherUserTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-200 rounded-lg px-4 py-2 text-gray-600 text-sm">
              <span className="animate-pulse">
                {otherUser.name || 'L\'utilisateur'} est en train d'écrire...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Formulaire d'envoi */}
      <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Écrivez votre message..."
            className="flex-1 p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            maxLength={1000}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || loading}
            className="px-6 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '⏳' : '📤'}
          </button>
        </div>
        
        {isTyping && (
          <p className="text-xs text-gray-500 mt-1">Vous êtes en train d'écrire...</p>
        )}
      </form>
    </div>
  );
};

export default Chat;