// src/components/navigation/ChatNavigation.tsx - Navigation vers le chat
'use client';

import React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { MessageCircle, Users, Heart } from 'lucide-react';

interface ChatNavigationProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ChatNavigation: React.FC<ChatNavigationProps> = ({
  className = '',
  showLabel = true,
  size = 'md'
}) => {
  const { data: session, status } = useSession();

  // Ne pas afficher si pas connecté
  if (status !== 'authenticated' || !session?.user) {
    return null;
  }

  const sizeClasses = {
    sm: 'p-2 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  };

  return (
    <Link
      href="/chat"
      className={`
        inline-flex items-center space-x-2 
        bg-gradient-to-r from-blue-500 to-purple-600 
        text-white rounded-lg 
        hover:from-blue-600 hover:to-purple-700 
        transition-all duration-200 
        shadow-sm hover:shadow-md
        ${sizeClasses[size]}
        ${className}
      `}
    >
      <MessageCircle size={iconSizes[size]} />
      {showLabel && <span>Chat Universel</span>}
    </Link>
  );
};

// Composant de statistiques du chat (optionnel)
export const ChatStats: React.FC = () => {
  const [stats, setStats] = React.useState({
    onlineUsers: 0,
    totalUsers: 0,
    totalMessages: 0
  });

  const loadStats = async () => {
    try {
      const response = await fetch('/api/chat/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erreur chargement stats chat:', error);
    }
  };

  React.useEffect(() => {
    loadStats();
    // Actualiser toutes les 30 secondes
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center space-x-4 text-sm text-gray-500">
      <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span>{stats.onlineUsers} en ligne</span>
      </div>
      <div className="flex items-center space-x-1">
        <Users size={14} />
        <span>{stats.totalUsers} membres</span>
      </div>
      <div className="flex items-center space-x-1">
        <MessageCircle size={14} />
        <span>{stats.totalMessages} messages</span>
      </div>
    </div>
  );
};

// Bouton flottant pour accès rapide au chat
export const FloatingChatButton: React.FC = () => {
  const { status } = useSession();

  if (status !== 'authenticated') return null;

  return (
    <Link
      href="/chat"
      className="fixed bottom-6 right-6 z-50 
                 w-14 h-14 
                 bg-gradient-to-r from-blue-500 to-purple-600 
                 text-white rounded-full 
                 shadow-lg hover:shadow-xl 
                 hover:from-blue-600 hover:to-purple-700 
                 transition-all duration-200 
                 flex items-center justify-center
                 group"
      title="Chat Universel"
    >
      <MessageCircle size={24} className="group-hover:scale-110 transition-transform" />
    </Link>
  );
};

// Notification de nouveaux messages (à implémenter avec Socket.io)
export const ChatNotificationBadge: React.FC<{ count?: number }> = ({ count = 0 }) => {
  if (!count || count <= 0) return null;

  return (
    <span className="absolute -top-1 -right-1 
                     bg-red-500 text-white 
                     text-xs font-bold 
                     rounded-full 
                     min-w-[18px] h-[18px] 
                     flex items-center justify-center 
                     animate-pulse">
      {count > 99 ? '99+' : count}
    </span>
  );
};

// Menu rapide du chat
export const ChatQuickMenu: React.FC = () => {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = React.useState(false);

  if (!session?.user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
      >
        <MessageCircle size={20} />
        <ChatNotificationBadge count={0} /> {/* À connecter avec vraies notifs */}
      </button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute right-0 top-full mt-2 w-80 
                         bg-white rounded-lg shadow-lg border 
                         z-20 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Chat Universel</h3>
            
            <div className="space-y-3">
              <Link
                href="/chat"
                className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <div className="flex items-center space-x-3">
                  <Users className="text-blue-500" size={20} />
                  <div>
                    <div className="font-medium">Voir tous les membres</div>
                    <div className="text-sm text-gray-500">
                      Commencer une nouvelle conversation
                    </div>
                  </div>
                </div>
              </Link>

              <div className="border-t pt-3">
                <ChatStats />
              </div>
              
              <div className="text-xs text-gray-500 text-center">
                💬 Chat libre sans restriction de match
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatNavigation;