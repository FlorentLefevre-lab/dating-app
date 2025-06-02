// server/socket-server.ts - Version corrigée avec parsing intelligent des IDs
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const httpServer = createServer();

// Configuration CORS pour Next.js
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Types
interface User {
  userId: string;
  userName: string;
  avatar?: string;
  socketId: string;
}

interface ConversationData {
  conversationId: string;
  participants: string[];
  messages: any[];
}

// États en mémoire
const connectedUsers = new Map<string, User>();
const userSockets = new Map<string, string>(); // userId -> socketId
const conversations = new Map<string, ConversationData>();

// Utilitaires améliorés
const generateConversationId = (userId1: string, userId2: string): string => {
  const sorted = [userId1, userId2].sort();
  // Encode de façon réversible - utiliser | comme séparateur principal
  return `conv_${sorted[0].replace(/[@.]/g, '_')}_|_${sorted[1].replace(/[@.]/g, '_')}`;
};

const parseConversationId = (conversationId: string): { user1Id: string, user2Id: string } | null => {
  try {
    // Enlever le préfixe 'conv_'
    const withoutPrefix = conversationId.replace('conv_', '');
    
    // Chercher le séparateur principal '_|_'
    const separatorIndex = withoutPrefix.indexOf('_|_');
    if (separatorIndex === -1) {
      // Fallback: essayer l'ancien format avec split au milieu
      console.warn('🔄 Utilisation du fallback parsing pour:', conversationId);
      const parts = withoutPrefix.split('_');
      if (parts.length < 2) return null;
      
      const midpoint = Math.floor(parts.length / 2);
      const user1Parts = parts.slice(0, midpoint);
      const user2Parts = parts.slice(midpoint);
      
      // Reconstituer intelligemment
      let user1Id = user1Parts.join('_');
      let user2Id = user2Parts.join('_');
      
      // Si ça ressemble à un email, restaurer @ et .
      if (user1Id.includes('_') && user1Parts.length >= 3) {
        const lastPart = user1Parts[user1Parts.length - 1];
        const secondLastPart = user1Parts[user1Parts.length - 2];
        if (['com', 'fr', 'org', 'net'].includes(lastPart)) {
          user1Id = user1Parts.slice(0, -2).join('.') + '@' + secondLastPart + '.' + lastPart;
        }
      }
      
      if (user2Id.includes('_') && user2Parts.length >= 3) {
        const lastPart = user2Parts[user2Parts.length - 1];
        const secondLastPart = user2Parts[user2Parts.length - 2];
        if (['com', 'fr', 'org', 'net'].includes(lastPart)) {
          user2Id = user2Parts.slice(0, -2).join('.') + '@' + secondLastPart + '.' + lastPart;
        }
      }
      
      return { user1Id, user2Id };
    }
    
    // Nouveau format avec séparateur '_|_'
    const user1Encoded = withoutPrefix.substring(0, separatorIndex);
    const user2Encoded = withoutPrefix.substring(separatorIndex + 3);
    
    // Décoder les IDs
    const user1Id = user1Encoded.replace(/_/g, '.').replace(/\.([^.]+)\.([^.]+)$/, '@$1.$2');
    const user2Id = user2Encoded.replace(/_/g, '.').replace(/\.([^.]+)\.([^.]+)$/, '@$1.$2');
    
    return { user1Id, user2Id };
    
  } catch (error) {
    console.error('❌ Erreur parsing conversationId:', error);
    return null;
  }
};

const logWithTimestamp = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data || '');
};

// Gestion des connexions
io.on('connection', (socket) => {
  logWithTimestamp('🔌 Nouvelle connexion Socket.io', { socketId: socket.id });

  // Authentification
  socket.on('authenticate', async (userData) => {
    try {
      logWithTimestamp('🔐 Tentative d\'authentification', userData);
      
      if (!userData.userId || !userData.userName) {
        socket.emit('error', { message: 'Données d\'authentification invalides' });
        return;
      }

      // Stocker l'utilisateur connecté
      const user: User = {
        userId: userData.userId,
        userName: userData.userName,
        avatar: userData.avatar,
        socketId: socket.id
      };

      connectedUsers.set(socket.id, user);
      userSockets.set(userData.userId, socket.id);

      logWithTimestamp('✅ Utilisateur authentifié', {
        userId: userData.userId,
        userName: userData.userName,
        socketId: socket.id
      });

      socket.emit('authenticated', {
        userId: userData.userId,
        userName: userData.userName,
        socketId: socket.id
      });

      // Notifier les autres utilisateurs
      socket.broadcast.emit('user_online', user);

      // Envoyer la liste des utilisateurs en ligne
      const onlineUsers = Array.from(connectedUsers.values()).map(u => ({
        id: u.userId,
        name: u.userName,
        avatar: u.avatar,
        online: true
      }));

      socket.emit('online_users', onlineUsers);

    } catch (error) {
      logWithTimestamp('❌ Erreur authentification', error);
      socket.emit('error', { message: 'Erreur lors de l\'authentification' });
    }
  });

  // Démarrer une conversation
  socket.on('start_conversation', async (data) => {
    try {
      const currentUser = connectedUsers.get(socket.id);
      if (!currentUser) {
        socket.emit('error', { message: 'Non authentifié' });
        return;
      }

      const { targetUserId } = data;
      logWithTimestamp('💬 Démarrage conversation', { 
        from: currentUser.userId, 
        to: targetUserId 
      });

      const conversationId = generateConversationId(currentUser.userId, targetUserId);

      // Récupérer les messages existants depuis la base
      const existingMessages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: currentUser.userId, receiverId: targetUserId },
            { senderId: targetUserId, receiverId: currentUser.userId }
          ]
        },
        include: {
          sender: {
            select: { id: true, name: true, image: true, email: true }
          }
        },
        orderBy: { createdAt: 'asc' },
        take: 50
      });

      const formattedMessages = existingMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        timestamp: msg.createdAt.toISOString(),
        conversationId,
        sender: msg.sender
      }));

      // Stocker la conversation
      conversations.set(conversationId, {
        conversationId,
        participants: [currentUser.userId, targetUserId],
        messages: formattedMessages
      });

      // Répondre à l'expéditeur
      socket.emit('conversation_started', {
        conversationId,
        targetUserId,
        messages: formattedMessages
      });

      // Notifier le destinataire s'il est connecté
      const targetSocketId = userSockets.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('conversation_ready', {
          conversationId,
          fromUserId: currentUser.userId,
          messages: formattedMessages
        });
      }

      logWithTimestamp('✅ Conversation démarrée', { 
        conversationId, 
        messagesCount: formattedMessages.length 
      });

    } catch (error) {
      logWithTimestamp('❌ Erreur démarrage conversation', error);
      socket.emit('error', { message: 'Impossible de démarrer la conversation' });
    }
  });

  // Envoyer un message - VERSION CORRIGÉE
  socket.on('send_message', async (data) => {
    try {
      const currentUser = connectedUsers.get(socket.id);
      if (!currentUser) {
        socket.emit('error', { message: 'Non authentifié' });
        return;
      }

      const { conversationId, content, type = 'text' } = data;
      
      if (!content?.trim()) {
        socket.emit('error', { message: 'Message vide' });
        return;
      }

      logWithTimestamp('📤 Envoi message', { 
        from: currentUser.userId, 
        conversationId,
        contentLength: content.length 
      });

      // Parser le conversationId de façon intelligente
      const parsedIds = parseConversationId(conversationId);
      if (!parsedIds) {
        logWithTimestamp('❌ ConversationId invalide', { conversationId });
        socket.emit('error', { message: 'ID de conversation invalide' });
        return;
      }

      const { user1Id, user2Id } = parsedIds;
      const receiverId = user1Id === currentUser.userId ? user2Id : user1Id;

      logWithTimestamp('🔍 Parsing conversation', {
        conversationId,
        user1Id,
        user2Id,
        currentUserId: currentUser.userId,
        receiverId
      });

      // Vérifier que le destinataire existe dans la base
      const receiverExists = await prisma.user.findFirst({
        where: {
          OR: [
            { id: receiverId },
            { email: receiverId }
          ]
        },
        select: { id: true }
      });

      if (!receiverExists) {
        logWithTimestamp('❌ Destinataire introuvable', { receiverId });
        socket.emit('error', { message: 'Destinataire introuvable' });
        return;
      }

      // Sauvegarder en base
      const savedMessage = await prisma.message.create({
        data: {
          content: content.trim(),
          senderId: currentUser.userId,
          receiverId: receiverExists.id
        },
        include: {
          sender: {
            select: { id: true, name: true, image: true, email: true }
          }
        }
      });

      const message = {
        id: savedMessage.id,
        content: savedMessage.content,
        senderId: savedMessage.senderId,
        receiverId: savedMessage.receiverId,
        timestamp: savedMessage.createdAt.toISOString(),
        conversationId,
        type,
        sender: savedMessage.sender
      };

      // Ajouter à la conversation en mémoire
      const conversation = conversations.get(conversationId);
      if (conversation) {
        conversation.messages.push(message);
      }

      // Envoyer à l'expéditeur
      socket.emit('new_message', { message, conversationId });

      // Envoyer au destinataire s'il est connecté
      const receiverSocketId = userSockets.get(receiverExists.id);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('new_message', { message, conversationId });
        logWithTimestamp('📨 Message transmis au destinataire connecté');
      } else {
        logWithTimestamp('💤 Destinataire hors ligne, message sauvé');
      }

      logWithTimestamp('✅ Message envoyé avec succès', { 
        messageId: message.id,
        to: receiverExists.id,
        hasReceiver: !!receiverSocketId
      });

    } catch (error) {
      logWithTimestamp('❌ Erreur envoi message', error);
      socket.emit('error', { message: 'Impossible d\'envoyer le message' });
    }
  });

  // Récupérer les conversations
  socket.on('get_conversations', async () => {
    try {
      const currentUser = connectedUsers.get(socket.id);
      if (!currentUser) {
        socket.emit('error', { message: 'Non authentifié' });
        return;
      }

      // Récupérer les conversations depuis la base
      const recentMessages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: currentUser.userId },
            { receiverId: currentUser.userId }
          ]
        },
        include: {
          sender: { select: { id: true, name: true, image: true, email: true } },
          receiver: { select: { id: true, name: true, image: true, email: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      });

      // Grouper par conversation
      const conversationMap = new Map();
      recentMessages.forEach(msg => {
        const otherUserId = msg.senderId === currentUser.userId ? msg.receiverId : msg.senderId;
        const otherUser = msg.senderId === currentUser.userId ? msg.receiver : msg.sender;
        
        if (!conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, {
            id: generateConversationId(currentUser.userId, otherUserId),
            with: otherUser,
            lastMessage: {
              id: msg.id,
              content: msg.content,
              timestamp: msg.createdAt.toISOString(),
              senderId: msg.senderId
            },
            lastActivity: msg.createdAt.toISOString(),
            unreadCount: 0 // À implémenter
          });
        }
      });

      const conversationsList = Array.from(conversationMap.values());
      
      socket.emit('conversations_list', conversationsList);
      
      logWithTimestamp('✅ Conversations envoyées', { 
        count: conversationsList.length 
      });

    } catch (error) {
      logWithTimestamp('❌ Erreur récupération conversations', error);
      socket.emit('error', { message: 'Impossible de récupérer les conversations' });
    }
  });

  // Récupérer les utilisateurs en ligne
  socket.on('get_online_users', () => {
    const onlineUsers = Array.from(connectedUsers.values()).map(u => ({
      id: u.userId,
      name: u.userName,
      avatar: u.avatar,
      online: true
    }));

    socket.emit('online_users', onlineUsers);
  });

  // Déconnexion
  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      logWithTimestamp('❌ Utilisateur déconnecté', {
        userId: user.userId,
        userName: user.userName
      });

      connectedUsers.delete(socket.id);
      userSockets.delete(user.userId);

      // Notifier les autres utilisateurs
      socket.broadcast.emit('user_offline', { userId: user.userId });
    }
  });

  // Gestion des erreurs
  socket.on('error', (error) => {
    logWithTimestamp('❌ Erreur Socket', error);
  });
});

// Démarrage du serveur
const PORT = process.env.SOCKET_PORT || 3001;

httpServer.listen(PORT, () => {
  logWithTimestamp(`🚀 Serveur Socket.io démarré sur le port ${PORT}`);
  logWithTimestamp(`📡 WebSocket disponible sur ws://localhost:${PORT}`);
  logWithTimestamp(`🌐 Interface HTTP sur http://localhost:${PORT}/socket.io/`);
  logWithTimestamp(`✨ Parsing intelligent des IDs activé`);
});

// Nettoyage à la fermeture
process.on('SIGTERM', async () => {
  logWithTimestamp('🛑 Arrêt du serveur Socket.io...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logWithTimestamp('🛑 Arrêt du serveur Socket.io (Ctrl+C)...');
  await prisma.$disconnect();
  process.exit(0);
});