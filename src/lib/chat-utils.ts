// src/lib/chat-utils.ts - Utilitaires pour le système de chat amélioré
import { Message, MatchConversation } from '@/types/chat';

// Formater l'heure d'un message avec gestion des fuseaux horaires
export const formatMessageTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // Moins d'une minute
  if (diff < 60000) return 'À l\'instant';
  
  // Moins d'une heure
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}min`;
  }
  
  // Moins de 24 heures
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h`;
  }
  
  // Moins d'une semaine
  if (diff < 7 * 86400000) {
    const days = Math.floor(diff / 86400000);
    return days === 1 ? 'Hier' : `${days}j`;
  }
  
  // Plus d'une semaine
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short'
  });
};

// Formater l'heure complète pour l'affichage détaillé
export const formatFullMessageTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString();
  
  const timeString = date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  if (isToday) {
    return `Aujourd'hui à ${timeString}`;
  } else if (isYesterday) {
    return `Hier à ${timeString}`;
  } else {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

// Tronquer un message avec gestion intelligente
export const truncateMessage = (content: string, maxLength: number = 50): string => {
  if (content.length <= maxLength) return content;
  
  // Chercher le dernier espace avant la limite
  const truncated = content.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
};

// Obtenir l'autre utilisateur dans une conversation
export const getOtherUser = (match: MatchConversation, currentUserId: string) => {
  return match.users.find(user => user.id !== currentUserId);
};

// Vérifier si un message a été lu
export const isMessageRead = (message: Message): boolean => {
  return Boolean(message.readAt);
};

// Vérifier si un message a été livré
export const isMessageDelivered = (message: Message): boolean => {
  return Boolean(message.deliveredAt) || Boolean(message.readAt);
};

// Obtenir le statut d'un message
export const getMessageStatus = (message: Message): 'sending' | 'sent' | 'delivered' | 'read' | 'failed' => {
  if (message.status === 'failed') return 'failed';
  if (message.readAt) return 'read';
  if (message.deliveredAt) return 'delivered';
  if (message.status === 'pending') return 'sending';
  return 'sent';
};

// Valider le contenu d'un message
export const validateMessageContent = (content: string): { isValid: boolean; error?: string } => {
  const trimmed = content.trim();
  
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Le message ne peut pas être vide' };
  }
  
  if (trimmed.length > 1000) {
    return { isValid: false, error: 'Le message ne peut pas dépasser 1000 caractères' };
  }
  
  // Vérifier les caractères interdits ou spéciaux
  const forbiddenChars = ['<script', '</script', 'javascript:', 'data:'];
  const hasInvalidContent = forbiddenChars.some(char => 
    trimmed.toLowerCase().includes(char.toLowerCase())
  );
  
  if (hasInvalidContent) {
    return { isValid: false, error: 'Le message contient du contenu non autorisé' };
  }
  
  return { isValid: true };
};

// Nettoyer et formater le contenu d'un message
export const sanitizeMessageContent = (content: string): string => {
  return content
    .trim()
    .replace(/\s+/g, ' ') // Remplacer les espaces multiples
    .replace(/\n{3,}/g, '\n\n'); // Limiter les sauts de ligne multiples
};

// Générer un ID de conversation à partir de deux IDs utilisateur
export const generateConversationId = (userId1: string, userId2: string): string => {
  const sortedIds = [userId1, userId2].sort();
  return `conv_${sortedIds.join('_')}`;
};

// Extraire les IDs utilisateur d'un ID de conversation
export const parseConversationId = (conversationId: string): { user1Id: string; user2Id: string } | null => {
  if (!conversationId.startsWith('conv_')) return null;
  
  const parts = conversationId.replace('conv_', '').split('_');
  if (parts.length < 2) return null;
  
  return {
    user1Id: parts[0],
    user2Id: parts[1]
  };
};

// Trier les conversations par activité récente
export const sortMatchesByActivity = (matches: MatchConversation[]): MatchConversation[] => {
  return matches.sort((a, b) => {
    // Prioriser les matches avec des messages non lus
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
    if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
    
    // Puis trier par date du dernier message
    const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    
    return bTime - aTime;
  });
};

// Calculer le nombre total de messages non lus
export const getTotalUnreadCount = (matches: MatchConversation[]): number => {
  return matches.reduce((total, match) => total + match.unreadCount, 0);
};

// Grouper les messages par date
export const groupMessagesByDate = (messages: Message[]): { [date: string]: Message[] } => {
  const grouped: { [date: string]: Message[] } = {};
  
  messages.forEach(message => {
    const date = new Date(message.createdAt).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    if (!grouped[date]) {
      grouped[date] = [];
    }
    
    grouped[date].push(message);
  });
  
  return grouped;
};

// Détecter si deux messages peuvent être groupés (même expéditeur, temps proche)
export const canGroupMessages = (msg1: Message, msg2: Message, maxTimeDiff: number = 300000): boolean => {
  if (msg1.senderId !== msg2.senderId) return false;
  
  const timeDiff = Math.abs(
    new Date(msg1.createdAt).getTime() - new Date(msg2.createdAt).getTime()
  );
  
  return timeDiff <= maxTimeDiff; // 5 minutes par défaut
};

// Calculer les statistiques d'une conversation
export const getConversationStats = (messages: Message[], currentUserId: string) => {
  const stats = {
    totalMessages: messages.length,
    sentByMe: 0,
    sentByOther: 0,
    unreadByMe: 0,
    averageResponseTime: 0,
    lastMessageTime: null as Date | null,
    firstMessageTime: null as Date | null
  };
  
  if (messages.length === 0) return stats;
  
  // Trier les messages par date
  const sortedMessages = [...messages].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  
  stats.firstMessageTime = new Date(sortedMessages[0].createdAt);
  stats.lastMessageTime = new Date(sortedMessages[sortedMessages.length - 1].createdAt);
  
  let responseTimes: number[] = [];
  let lastOtherMessageTime: Date | null = null;
  
  messages.forEach(message => {
    if (message.senderId === currentUserId) {
      stats.sentByMe++;
      
      // Calculer le temps de réponse
      if (lastOtherMessageTime) {
        const responseTime = new Date(message.createdAt).getTime() - lastOtherMessageTime.getTime();
        if (responseTime > 0 && responseTime < 24 * 60 * 60 * 1000) { // Max 24h
          responseTimes.push(responseTime);
        }
      }
    } else {
      stats.sentByOther++;
      lastOtherMessageTime = new Date(message.createdAt);
      
      if (!message.readAt) {
        stats.unreadByMe++;
      }
    }
  });
  
  // Calculer le temps de réponse moyen
  if (responseTimes.length > 0) {
    stats.averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  }
  
  return stats;
};

// Détecter les mentions dans un message
export const detectMentions = (content: string): string[] => {
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  
  return mentions;
};

// Détecter les liens dans un message
export const detectLinks = (content: string): string[] => {
  const linkRegex = /(https?:\/\/[^\s]+)/g;
  const links: string[] = [];
  let match;
  
  while ((match = linkRegex.exec(content)) !== null) {
    links.push(match[1]);
  }
  
  return links;
};

// Formater un message avec mise en forme (gras, italique, etc.)
export const formatMessageContent = (content: string): string => {
  return content
    // Gras: **texte**
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italique: *texte*
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code: `code`
    .replace(/`(.*?)`/g, '<code>$1</code>')
    // Sauts de ligne
    .replace(/\n/g, '<br>');
};

// Générer un aperçu d'un message pour les notifications
export const generateMessagePreview = (content: string, maxLength: number = 50): string => {
  // Nettoyer le HTML/Markdown
  const cleaned = content
    .replace(/\*\*(.*?)\*\*/g, '$1') // Retirer les marqueurs gras
    .replace(/\*(.*?)\*/g, '$1')     // Retirer les marqueurs italique
    .replace(/`(.*?)`/g, '$1')       // Retirer les marqueurs code
    .replace(/\n/g, ' ');            // Remplacer les sauts de ligne par des espaces
  
  return truncateMessage(cleaned, maxLength);
};

// Vérifier si l'utilisateur est en train de taper (pour les indicateurs)
export const isTypingRecent = (lastTypingTime: Date, thresholdMs: number = 3000): boolean => {
  return Date.now() - lastTypingTime.getTime() < thresholdMs;
};

// Calculer la compatibilité entre deux utilisateurs (exemple basique)
export const calculateCompatibility = (user1: any, user2: any): number => {
  let score = 0;
  let factors = 0;
  
  // Âge (plus la différence est petite, mieux c'est)
  if (user1.age && user2.age) {
    const ageDiff = Math.abs(user1.age - user2.age);
    score += Math.max(0, 20 - ageDiff); // Max 20 points
    factors++;
  }
  
  // Localisation
  if (user1.location && user2.location && user1.location === user2.location) {
    score += 15;
  }
  factors++;
  
  // Intérêts communs
  if (user1.interests && user2.interests) {
    const commonInterests = user1.interests.filter((interest: string) => 
      user2.interests.includes(interest)
    );
    score += commonInterests.length * 5; // 5 points par intérêt commun
  }
  factors++;
  
  // Profession similaire
  if (user1.profession && user2.profession && user1.profession === user2.profession) {
    score += 10;
  }
  factors++;
  
  return Math.min(100, Math.round(score)); // Max 100%
};

// Débouncer une fonction (utile pour les indicateurs de frappe)
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle une fonction (utile pour limiter les appels API)
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};