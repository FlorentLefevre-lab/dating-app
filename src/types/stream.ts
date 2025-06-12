// ================================
// 🔧 types/stream.ts - VERSION CORRIGÉE
// ================================

// ================================
// TYPES UTILISATEUR DE BASE
// ================================

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  age?: number | null;
  bio?: string | null;
  location?: string | null;
  profession?: string | null;
  gender?: string | null;
  interests?: string[];
  isOnline?: boolean;
  lastSeen?: Date | null;
}

export interface PrismaUser {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
  age?: number | null;
  bio?: string | null;
  location?: string | null;
  profession?: string | null;
  gender?: string | null;
  interests?: string[];
  isOnline?: boolean;
  lastSeen?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ================================
// TYPES STREAM (sans imports directs)
// ================================

export interface StreamUser {
  id: string;
  name: string;
  image?: string;
  role?: string;
  custom?: Record<string, any>;
}

export interface StreamTokenResponse {
  token: string;
  apiKey: string;
  userId: string;
}

export interface MessagePreview {
  id: string;
  text: string;
  user: {
    id: string;
    name: string;
    image?: string;
  };
  created_at: string;
  type: string;
}

export interface CallState {
  id: string;
  type: 'audio' | 'video';
  participants: number;
  duration: number;
  status: 'ringing' | 'active' | 'ended';
}

// ================================
// TYPES COMPOSANTS
// ================================

export type TabType = 'chat' | 'video' | 'profile' | 'settings';

export interface ChatComponentProps {
  chatClient: any | null; // StreamChat
  channel: any | null; // Channel
  otherUser: User;
  onStartCall?: () => void;
  onStartVideoCall?: () => void;
}

export interface VideoCallComponentProps {
  videoClient: any | null; // StreamVideoClient
  call: any | null; // Call
  onEndCall: () => void;
  otherUser: User;
}

export interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isInCall: boolean;
  onStartVideoCall: () => void;
  onEndCall: () => void;
}

export interface SidebarProps {
  matchedUser: User;
}

export interface ProfileTabProps {
  currentUser: User;
}

// ================================
// HOOKS RETURN TYPES
// ================================

// ✅ CORRECTION: Ajout du token manquant
export interface UseStreamReturn {
  chatClient: any | null; // StreamChat
  videoClient: any | null; // StreamVideoClient  
  channel: any | null; // Channel
  token: string | null; // ✅ AJOUTÉ
  loading: boolean;
  error: string | null;
}

export interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

// ================================
// TYPES POUR CHAT
// ================================

export interface ChatMessage {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userImage?: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file';
  attachments?: ChatAttachment[];
}

export interface ChatAttachment {
  id: string;
  type: 'image' | 'file';
  url: string;
  name: string;
  size?: number;
}

export interface ChannelData {
  id: string;
  name?: string;
  image?: string;
  members: string[];
  lastMessage?: MessagePreview;
  unreadCount?: number;
  created_at: Date;
  updated_at: Date;
}

// ================================
// TYPES POUR STATUTS
// ================================

export interface OnlineStatus {
  isOnline: boolean;
  text: string;
  color: string;
}

export interface UserPresence {
  userId: string;
  isOnline: boolean;
  lastSeen: Date | null;
}

// ================================
// TYPES POUR ERREURS
// ================================

export interface StreamError {
  code: string;
  message: string;
  details?: any;
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
}

// ================================
// 🔧 utils/streamHelpers.ts - NOUVEAU FICHIER
// ================================

/**
 * Convertit un utilisateur Prisma en utilisateur Stream
 */
export const prismaUserToStreamUser = (prismaUser: PrismaUser): User => ({
  id: prismaUser.id,
  name: prismaUser.name || 'Utilisateur',
  email: prismaUser.email,
  image: prismaUser.image || undefined,
  age: prismaUser.age,
  bio: prismaUser.bio,
  location: prismaUser.location,
  profession: prismaUser.profession,
  gender: prismaUser.gender,
  interests: prismaUser.interests || [],
  isOnline: prismaUser.isOnline || false,
  lastSeen: prismaUser.lastSeen,
});

/**
 * Convertit un utilisateur en utilisateur Stream SDK
 */
export const userToStreamUser = (user: User): StreamUser => ({
  id: user.id,
  name: user.name,
  image: user.image,
  custom: {
    email: user.email,
    age: user.age,
    bio: user.bio,
    location: user.location,
    profession: user.profession,
    gender: user.gender,
    interests: user.interests,
  }
});

/**
 * Génère un ID de channel unique pour deux utilisateurs
 */
export const generateChannelId = (userId1: string, userId2: string): string => {
  const sortedIds = [userId1, userId2].sort();
  return `match_${sortedIds[0]}_${sortedIds[1]}`;
};

/**
 * Formate la dernière connexion d'un utilisateur
 */
export const formatLastSeen = (lastSeen: Date | null): string => {
  if (!lastSeen) return 'Jamais vu';
  
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffMinutes < 1) return 'À l\'instant';
  if (diffMinutes < 60) return `Il y a ${diffMinutes}min`;
  if (diffMinutes < 1440) return `Il y a ${Math.floor(diffMinutes / 60)}h`;
  return `Il y a ${Math.floor(diffMinutes / 1440)}j`;
};

/**
 * Détermine le statut en ligne d'un utilisateur
 */
export const getOnlineStatus = (user: User): OnlineStatus => {
  if (user.isOnline) {
    return { isOnline: true, text: 'En ligne', color: 'text-green-600' };
  }
  
  if (user.lastSeen) {
    const diffMs = Date.now() - user.lastSeen.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 5) {
      return { isOnline: false, text: 'À l\'instant', color: 'text-green-500' };
    }
    if (diffMinutes < 60) {
      return { isOnline: false, text: `Il y a ${diffMinutes}min`, color: 'text-yellow-600' };
    }
    if (diffMinutes < 1440) {
      return { isOnline: false, text: `Il y a ${Math.floor(diffMinutes / 60)}h`, color: 'text-gray-500' };
    }
  }
  
  return { isOnline: false, text: 'Hors ligne', color: 'text-gray-400' };
};

/**
 * Valide si un utilisateur est valide pour Stream
 */
export const isValidStreamUser = (user: any): user is User => {
  return (
    user &&
    typeof user.id === 'string' &&
    typeof user.name === 'string' &&
    typeof user.email === 'string'
  );
};

/**
 * Crée un nom de channel lisible
 */
export const createChannelName = (user1: User, user2: User): string => {
  return `${user1.name} & ${user2.name}`;
};

/**
 * Extrait les métadonnées d'un channel
 */
export const extractChannelMetadata = (channelData: any) => {
  const members = Object.values(channelData.state?.members || {});
  const otherMembers = members.filter((member: any) => member.user_id !== channelData._client?.userID);
  
  return {
    memberCount: members.length,
    otherMembers,
    lastActivity: channelData.state?.last_message_at,
    unreadCount: channelData.countUnread?.() || 0
  };
};

// ================================
// 🔧 hooks/useStreamValidation.ts - NOUVEAU HOOK
// ================================

import { useMemo } from 'react';

export const useStreamValidation = (user: User | null) => {
  const validation = useMemo(() => {
    if (!user) {
      return {
        isValid: false,
        errors: ['Utilisateur non défini'],
        canConnect: false
      };
    }

    const errors: string[] = [];

    if (!user.id) errors.push('ID utilisateur manquant');
    if (!user.name || user.name.trim() === '') errors.push('Nom utilisateur manquant');
    if (!user.email) errors.push('Email utilisateur manquant');

    // Vérifications environnement
    if (!process.env.NEXT_PUBLIC_STREAM_API_KEY) {
      errors.push('Clé API Stream manquante');
    }

    return {
      isValid: errors.length === 0,
      errors,
      canConnect: errors.length === 0 && !!process.env.NEXT_PUBLIC_STREAM_API_KEY,
      user: isValidStreamUser(user) ? user : null
    };
  }, [user]);

  return validation;
};

// ================================
// 🔧 constants/streamConfig.ts - CONFIGURATION
// ================================

export const STREAM_CONFIG = {
  API_KEY: process.env.NEXT_PUBLIC_STREAM_API_KEY,
  RECONNECT_INTERVAL: 3000,
  MAX_RECONNECT_ATTEMPTS: 5,
  PRESENCE_TIMEOUT: 60000, // 1 minute
  MESSAGE_LIMIT: 50,
  CHANNEL_LIMIT: 20,
  TYPING_TIMEOUT: 3000,
} as const;

export const STREAM_EVENTS = {
  CONNECTION_CHANGED: 'connection.changed',
  MESSAGE_NEW: 'message.new',
  MESSAGE_READ: 'message.read',
  USER_PRESENCE_CHANGED: 'user.presence.changed',
  TYPING_START: 'typing.start',
  TYPING_STOP: 'typing.stop',
} as const;

export const CHANNEL_CONFIG = {
  TYPE: 'messaging',
  AUTO_WATCH: true,
  PRESENCE: true,
  STATE: true,
  RECOVERY: true,
} as const;