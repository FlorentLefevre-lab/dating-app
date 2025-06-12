// 📁 src/components/chat/SimpleChatHeader.tsx
import React from 'react';

interface SimpleChatHeaderProps {
  otherUser?: {
    id: string;
    name: string;
    image?: string;
    isOnline?: boolean;
  };
  onVideoCall?: () => void;
  onAudioCall?: () => void;
  onBack?: () => void; // Pour mobile
}

export const SimpleChatHeader: React.FC<SimpleChatHeaderProps> = ({
  otherUser,
  onVideoCall,
  onAudioCall,
  onBack
}) => {
  if (!otherUser) {
    // Header par défaut si pas d'utilisateur
    return (
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-xs">💬</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Messages</h3>
            <p className="text-sm text-gray-500">Sélectionnez une conversation</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center space-x-3">
        {/* Bouton retour pour mobile */}
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
          >
            <span className="text-lg">←</span>
          </button>
        )}
        
        {/* Avatar avec indicateur en ligne */}
        <div className="relative">
          <img
            src={otherUser.image || '/default-avatar.png'}
            alt={otherUser.name}
            className="w-10 h-10 rounded-full border-2 border-pink-200 object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/default-avatar.png';
            }}
          />
          {otherUser.isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          )}
        </div>
        
        {/* Infos utilisateur */}
        <div>
          <h3 className="font-semibold text-gray-900">
            {otherUser.name}
          </h3>
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${otherUser.isOnline ? 'bg-green-400' : 'bg-gray-400'}`}></div>
            <p className="text-sm text-gray-500">
              {otherUser.isOnline ? 'En ligne' : 'Hors ligne'}
            </p>
          </div>
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="flex items-center space-x-2">
        {onAudioCall && (
          <button
            onClick={onAudioCall}
            className="p-2 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
            title="Appel audio"
          >
            📞
          </button>
        )}
        
        {onVideoCall && (
          <button
            onClick={onVideoCall}
            className="p-2 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
            title="Appel vidéo"
          >
            📹
          </button>
        )}
        
        <button 
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
          title="Plus d'options"
        >
          ⋮
        </button>
      </div>
    </div>
  );
};