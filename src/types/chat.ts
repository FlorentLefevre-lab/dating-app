// src/types/chat.ts - Types pour le système de chat

export interface User {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  age?: number;
  bio?: string;
  location?: string;
  profession?: string;
  interests?: string[];
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
  readAt?: string | null;
  deliveredAt?: string | null;
  timestamp?: Date;
  messageType?: MessageType;
  status?: MessageStatus;
  clientId?: string;
  replyToId?: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  metadata?: any;
  sender?: User;
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
  isDuplicate?: boolean;
}

export interface MessageAttachment {
  id: string;
  messageId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  thumbnailUrl?: string;
  createdAt: string;
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
  user?: User;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  name?: string;
  users: User[];
  lastMessage?: Message;
  unreadCount: number;
  messageCount: number;
  lastActivity: string;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    canMessage: boolean;
    isMatch?: boolean;
    sentLike?: boolean;
    receivedLike?: boolean;
    mutualLike?: boolean;
  };
}

export interface MatchConversation extends Conversation {
  relationshipStatus: 'match' | 'mutual_like' | 'liked_by_me' | 'liked_me' | 'no_interaction';
  hasMatch: boolean;
}

export interface Match {
  id: string;
  user: User;
  matchedAt: string;
  compatibility?: number;
  conversation?: Conversation;
}

export interface TypingIndicator {
  id: string;
  conversationId: string;
  userId: string;
  isTyping: boolean;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export interface ChatState {
  messages: Message[];
  loading: boolean;
  error: string | null;
  hasMoreMessages: boolean;
  isLoadingMore: boolean;
  lastSyncTimestamp: string | null;
  unreadCount: number;
}

export interface ConversationMember {
  id: string;
  conversationId: string;
  userId: string;
  joinedAt: string;
  leftAt?: string | null;
  role: MemberRole;
  user?: User;
}

export interface NotificationSettings {
  id: string;
  userId: string;
  messageNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  quietHours?: {
    start: string;
    end: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ChatStatistics {
  id: string;
  date: string;
  totalMessages: number;
  totalActiveUsers: number;
  totalConversations: number;
  averageResponseTime?: number;
  createdAt: string;
}

export interface ConversationStats {
  totalMessages: number;
  sentByMe: number;
  sentByOther: number;
  unreadByMe: number;
  averageResponseTime: number;
  lastMessageTime: Date | null;
  firstMessageTime: Date | null;
}

// Types pour les événements Socket.IO
export interface SocketEvents {
  // Messages
  'message:send': (data: {
    messageId: string;
    conversationId: string;
    content: string;
    to: string;
    from: string;
    timestamp: string;
  }) => void;
  
  'message:received': (data: {
    messageId: string;
    conversationId: string;
    content: string;
    from: string;
    to: string;
    timestamp: string;
  }) => void;
  
  'message:delivered': (data: {
    messageId: string;
    deliveredAt: string;
  }) => void;
  
  'message:read': (data: {
    messageId: string;
    readAt: string;
  }) => void;
  
  // Indicateurs de frappe
  'typing:start': (data: {
    conversationId: string;
    userId: string;
  }) => void;
  
  'typing:stop': (data: {
    conversationId: string;
    userId: string;
  }) => void;
  
  // Authentification
  'user:authenticate': (data: {
    userId: string;
    userEmail: string;
    userName?: string;
  }) => void;
  
  // Test
  'test:connection': (data: {
    timestamp: number;
  }) => void;
  
  // Historique de conversation
  'conversation:history': (data: {
    conversationId: string;
    targetUserId: string;
    limit?: number;
  }) => void;
  
  // Erreurs
  'conversation:error': (data: {
    error: string;
    conversationId?: string;
  }) => void;
}

// Enums
export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  FILE = 'FILE',
  LOCATION = 'LOCATION',
  STICKER = 'STICKER',
  GIF = 'GIF'
}

export enum MessageStatus {
  SENDING = 'SENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED'
}

export enum ConversationType {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
  BROADCAST = 'BROADCAST'
}

export enum MemberRole {
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  MEMBER = 'MEMBER'
}

// Types utilitaires
export type MessageWithSender = Message & {
  sender: User;
};

export type ConversationWithMembers = Conversation & {
  members: ConversationMember[];
};

export type MessageGroupedByDate = {
  [date: string]: Message[];
};

export type SendMessageOptions = {
  content: string;
  receiverId: string;
  conversationId?: string;
  clientMessageId?: string;
  timestamp?: string;
  messageType?: MessageType;
  replyToId?: string;
  attachments?: File[];
};

export type LoadMessagesOptions = {
  conversationId: string;
  lastMessageId?: string;
  limit?: number;
  sinceTimestamp?: string;
};

export type SyncOptions = {
  lastSyncTimestamp: string;
  conversationId?: string;
};

// Types pour les réponses API
export interface ChatAPIResponse {
  success: boolean;
  messages: Message[];
  conversation: {
    type: string;
    otherUser: User;
    currentUser: User;
    conversationId: string;
    totalMessages: number;
    unreadCount: number;
  };
  pagination: {
    hasMore: boolean;
    lastMessageId: string | null;
    oldestMessageId: string | null;
  };
  synchronization: {
    serverTimestamp: string;
    isSyncMode: boolean;
    messagesCount: number;
  };
  debug?: any;
}

export interface SendMessageAPIResponse {
  success: boolean;
  message: Message;
  conversationId: string;
  chatType: string;
  serverTimestamp: string;
  debug?: any;
}

export interface SyncAPIResponse {
  success: boolean;
  missedMessages: Message[];
  syncTimestamp: string;
  count: number;
}

// Types pour les hooks
export interface UseChatReturn {
  messages: Message[];
  loading: boolean;
  error: string | null;
  hasMoreMessages: boolean;
  isLoadingMore: boolean;
  unreadCount: number;
  sendMessage: (content: string) => Promise<string>;
  loadMoreMessages: () => Promise<void>;
  retryFailedMessages: () => Promise<void>;
  syncMissedMessages: () => Promise<void>;
  markAsRead: () => Promise<void>;
  isConnected: boolean;
}

export interface UseOfflineMessagesReturn {
  offlineStats: {
    total: number;
    pending: number;
    failed: number;
    syncing: number;
    oldestMessage?: string;
  };
  isSyncing: boolean;
  syncMessages: () => Promise<{ success: number; failed: number }>;
  cleanup: () => void;
  refreshStats: () => void;
  isOnline: boolean;
}