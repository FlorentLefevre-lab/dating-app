// server.js - Version AMÉLIORÉE avec persistance et gestion offline/online
const { createServer } = require('http');
const next = require('next');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

console.log('🚀 Démarrage serveur WebRTC avec persistance...');

// Initialisation Prisma
const prisma = new PrismaClient();

// App Next.js
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

// Stockage en mémoire (pour performance + fallback)
const connectedUsers = new Map();
const userSockets = new Map(); // userId -> Set of socketIds
const conversationHistory = new Map();
const messageQueue = new Map();
const typingUsers = new Map(); // conversationId -> Set of userIds

// Variables globales
let io = null;
let server = null;
let heartbeatInterval = null;

// Fonctions utilitaires améliorées
function createConversationId(userId1, userId2) {
  return `conv_${[userId1, userId2].sort().join('_')}`;
}

function getUserSockets(userId) {
  return userSockets.get(userId) || new Set();
}

function addUserSocket(userId, socketId) {
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId).add(socketId);
}

function removeUserSocket(userId, socketId) {
  const sockets = userSockets.get(userId);
  if (sockets) {
    sockets.delete(socketId);
    if (sockets.size === 0) {
      userSockets.delete(userId);
      return true; // Dernière connexion de l'utilisateur
    }
  }
  return false;
}

function broadcastToUser(userId, event, data) {
  const sockets = getUserSockets(userId);
  sockets.forEach(socketId => {
    const socket = io.sockets.sockets.get(socketId);
    if (socket && socket.connected) {
      socket.emit(event, data);
    }
  });
  return sockets.size > 0;
}

// Gestion de la persistance des messages
async function saveMessage(messageData) {
  try {
    const message = await prisma.message.create({
      data: {
        id: messageData.id,
        content: messageData.content,
        senderId: messageData.from,
        receiverId: messageData.to,
        messageType: 'TEXT',
        status: 'SENT',
        deliveredAt: new Date(),
        createdAt: messageData.timestamp ? new Date(messageData.timestamp) : new Date()
      },
      include: {
        sender: {
          select: { id: true, name: true, image: true, email: true }
        }
      }
    });

    console.log('💾 Message sauvegardé:', {
      id: message.id,
      from: messageData.from,
      to: messageData.to
    });

    return message;
  } catch (error) {
    console.error('❌ Erreur sauvegarde message:', error);
    return null;
  }
}

// Mise à jour du statut utilisateur
async function updateUserStatus(userId, isOnline, socketId = null) {
  try {
    const userData = {
      isOnline,
      lastSeen: new Date()
    };

    await prisma.user.update({
      where: { id: userId },
      data: userData
    });

    // Broadcast du changement de statut aux autres utilisateurs
    const statusUpdate = {
      userId,
      isOnline,
      lastSeen: userData.lastSeen.toISOString(),
      status: isOnline ? 'online' : 'offline'
    };

    // Diffuser à tous les autres utilisateurs connectés
    connectedUsers.forEach((user, sid) => {
      if (user.userId !== userId && sid !== socketId) {
        const socket = io.sockets.sockets.get(sid);
        if (socket && socket.connected) {
          socket.emit('user:status-update', statusUpdate);
        }
      }
    });

    console.log('👤 Statut utilisateur mis à jour:', {
      userId,
      isOnline,
      connectedSockets: getUserSockets(userId).size
    });

    return true;
  } catch (error) {
    console.error('❌ Erreur mise à jour statut:', error);
    return false;
  }
}

// Récupération des messages manqués
async function getMissedMessages(userId, lastSyncTimestamp) {
  try {
    const messages = await prisma.message.findMany({
      where: {
        receiverId: userId,
        createdAt: {
          gt: new Date(lastSyncTimestamp)
        }
      },
      include: {
        sender: {
          select: { id: true, name: true, image: true, email: true }
        }
      },
      orderBy: { createdAt: 'asc' },
      take: 50
    });

    return messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      timestamp: msg.createdAt.toISOString(),
      readAt: msg.readAt?.toISOString() || null,
      sender: msg.sender,
      status: msg.readAt ? 'read' : 'delivered'
    }));
  } catch (error) {
    console.error('❌ Erreur récupération messages manqués:', error);
    return [];
  }
}

// Configuration Socket.IO handlers AMÉLIORÉE
function setupSocketHandlers(socket, io) {
  let isAuthenticated = false;
  let userId = null;
  let userName = null;

  console.log(`🟢 Nouvelle connexion: ${socket.id}`);

  // Authentification AMÉLIORÉE
  socket.on('user:authenticate', async (data) => {
    console.log(`🔐 Authentification:`, data);
    
    if (!data || !data.userId) {
      socket.emit('auth:error', { error: 'userId requis' });
      return;
    }
    
    try {
      userId = data.userId;
      userName = data.userName || data.userEmail || 'Utilisateur';
      
      // Vérifier que l'utilisateur existe en base
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, image: true }
      });

      if (!user) {
        socket.emit('auth:error', { error: 'Utilisateur introuvable' });
        return;
      }

      // Enregistrer la connexion
      connectedUsers.set(socket.id, {
        userId,
        socketId: socket.id,
        email: user.email,
        name: user.name || userName,
        connectedAt: new Date(),
        lastSeen: new Date()
      });

      addUserSocket(userId, socket.id);
      
      socket.userId = userId;
      socket.userName = user.name || userName;
      isAuthenticated = true;
      
      // Mettre à jour le statut en ligne
      await updateUserStatus(userId, true, socket.id);
      
      console.log(`✅ ${socket.userName} (${userId}) authentifié`);
      
      socket.emit('authenticated', { 
        userId, 
        userName: socket.userName,
        connectedUsers: connectedUsers.size,
        status: 'success',
        timestamp: new Date().toISOString()
      });

      // Envoyer les messages manqués si demandé
      if (data.lastSyncTimestamp) {
        const missedMessages = await getMissedMessages(userId, data.lastSyncTimestamp);
        if (missedMessages.length > 0) {
          socket.emit('messages:missed', {
            messages: missedMessages,
            count: missedMessages.length,
            syncTimestamp: new Date().toISOString()
          });
          console.log(`📨 ${missedMessages.length} messages manqués envoyés à ${userId}`);
        }
      }

    } catch (error) {
      console.error('❌ Erreur authentification:', error);
      socket.emit('auth:error', { error: 'Erreur serveur' });
    }
  });

  // Test de connexion AMÉLIORÉ
  socket.on('test:connection', (data) => {
    console.log(`🧪 Test:`, data);
    socket.emit('test:response', { 
      message: 'Connexion OK - Serveur WebRTC avec persistance', 
      timestamp: new Date().toISOString(),
      socketId: socket.id,
      userId: socket.userId || null,
      isAuthenticated,
      connectedUsers: connectedUsers.size,
      userSockets: getUserSockets(socket.userId || '').size,
      features: ['webrtc', 'persistence', 'offline-sync', 'status-tracking']
    });
  });

  // Messages AMÉLIORÉS avec persistance
  socket.on('message:send', async (data) => {
    if (!isAuthenticated) {
      socket.emit('auth:required', { error: 'Authentification requise' });
      return;
    }
    
    console.log(`💬 Message:`, data);
    
    try {
      const { content, to, conversationId, id, clientId, timestamp } = data;
      const from = socket.userId;
      
      if (!content || !content.trim() || !to) {
        socket.emit('message:error', { error: 'Contenu et destinataire requis' });
        return;
      }

      const messageData = {
        id: id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversationId: conversationId || createConversationId(from, to),
        content: content.trim(),
        from,
        to,
        timestamp: timestamp || new Date().toISOString(),
        status: 'sent',
        clientId
      };
      
      // Sauvegarder en base de données
      const savedMessage = await saveMessage(messageData);
      
      if (savedMessage) {
        // Confirmer l'envoi à l'expéditeur
        socket.emit('message:delivered', { 
          messageId: savedMessage.id,
          clientId: messageData.clientId,
          status: 'delivered',
          timestamp: savedMessage.createdAt.toISOString()
        });

        // Envoyer au destinataire s'il est connecté
        const delivered = broadcastToUser(to, 'message:received', {
          id: savedMessage.id,
          content: savedMessage.content,
          senderId: from,
          receiverId: to,
          timestamp: savedMessage.createdAt.toISOString(),
          sender: savedMessage.sender,
          conversationId: messageData.conversationId,
          status: 'delivered'
        });

        if (delivered) {
          console.log(`✅ Message envoyé: ${from} -> ${to} (${getUserSockets(to).size} sockets)`);
        } else {
          console.log(`📭 Destinataire hors ligne: ${to} - Message sauvegardé`);
        }
      } else {
        socket.emit('message:error', { 
          error: 'Erreur sauvegarde message',
          clientId: messageData.clientId 
        });
      }

    } catch (error) {
      console.error('❌ Erreur envoi message:', error);
      socket.emit('message:error', { 
        error: 'Erreur serveur',
        clientId: data.clientId 
      });
    }
  });

  // Marquer message comme lu
  socket.on('message:mark-read', async (data) => {
    if (!isAuthenticated) return;

    try {
      const { messageId } = data;
      
      await prisma.message.update({
        where: { id: messageId },
        data: { readAt: new Date() }
      });

      // Notifier l'expéditeur
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        select: { senderId: true }
      });

      if (message) {
        broadcastToUser(message.senderId, 'message:read', {
          messageId,
          readAt: new Date().toISOString(),
          readBy: userId
        });
      }

    } catch (error) {
      console.error('❌ Erreur marquage lu:', error);
    }
  });

  // Heartbeat pour maintenir le statut
  socket.on('user:heartbeat', async (data) => {
    if (!isAuthenticated || !userId) return;

    try {
      const socketUser = connectedUsers.get(socket.id);
      if (socketUser) {
        socketUser.lastSeen = new Date();
      }

      await prisma.user.update({
        where: { id: userId },
        data: { 
          isOnline: true,
          lastSeen: new Date() 
        }
      });

    } catch (error) {
      console.error('❌ Erreur heartbeat:', error);
    }
  });

  // Statuts utilisateur
  socket.on('user:status:request', async (data) => {
    if (!isAuthenticated) return;

    try {
      const { userId: requestedUserId } = data;
      
      const user = await prisma.user.findUnique({
        where: { id: requestedUserId },
        select: { id: true, name: true, isOnline: true, lastSeen: true }
      });

      if (user) {
        socket.emit('user:status', {
          userId: user.id,
          name: user.name,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen?.toISOString(),
          status: user.isOnline ? 'online' : 'offline'
        });
      }

    } catch (error) {
      console.error('❌ Erreur requête statut:', error);
    }
  });

  // Indicateurs de frappe
  socket.on('typing:start', (data) => {
    if (!isAuthenticated) return;

    const { to, conversationId } = data;
    
    broadcastToUser(to, 'typing:update', {
      userId: socket.userId,
      userName: socket.userName,
      conversationId,
      isTyping: true
    });
  });

  socket.on('typing:stop', (data) => {
    if (!isAuthenticated) return;

    const { to, conversationId } = data;
    
    broadcastToUser(to, 'typing:update', {
      userId: socket.userId,
      userName: socket.userName,
      conversationId,
      isTyping: false
    });
  });

  // Synchronisation des messages manqués
  socket.on('messages:sync', async (data) => {
    if (!isAuthenticated) return;

    try {
      const { lastSyncTimestamp } = data;
      const missedMessages = await getMissedMessages(userId, lastSyncTimestamp);
      
      socket.emit('messages:synced', {
        messages: missedMessages,
        count: missedMessages.length,
        syncTimestamp: new Date().toISOString()
      });

      console.log(`🔄 Synchronisation: ${missedMessages.length} messages pour ${userId}`);

    } catch (error) {
      console.error('❌ Erreur synchronisation:', error);
      socket.emit('messages:sync-error', { error: 'Erreur synchronisation' });
    }
  });

  // Handlers appels vidéo WebRTC
  socket.on('call:offer', (data) => {
    if (!isAuthenticated) {
      socket.emit('auth:required', { error: 'Authentification requise' });
      return;
    }
    
    const targetUserId = data.to || data.targetUserId;
    console.log(`📡 Offre WebRTC:`, { from: socket.userId, to: targetUserId });
    
    if (!targetUserId) {
      socket.emit('call:error', { error: 'Destinataire non spécifié' });
      return;
    }
    
    const { offer, conversationId, callId, callerId, callerName, isVideoCall } = data;
    
    const delivered = broadcastToUser(targetUserId, 'call:incoming', {
      callId: callId || `call_${Date.now()}`,
      callerId: callerId || socket.userId,
      callerName: callerName || socket.userName || 'Utilisateur',
      isVideoCall: isVideoCall || false,
      offer,
      conversationId,
      from: socket.userId,
      fromName: socket.userName,
      timestamp: new Date().toISOString()
    });
    
    if (delivered) {
      console.log(`✅ Appel envoyé: ${socket.userId} -> ${targetUserId}`);
    } else {
      socket.emit('call:error', { error: 'Destinataire non disponible' });
    }
  });

  socket.on('call:answer', (data) => {
    if (!isAuthenticated) return;
    
    const targetUserId = data.to || data.targetUserId || data.callerId;
    console.log(`📡 Réponse WebRTC:`, { from: socket.userId, to: targetUserId });
    
    broadcastToUser(targetUserId, 'call:answered', {
      from: socket.userId,
      answer: data.answer,
      callId: data.callId,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('call:ice-candidate', (data) => {
    if (!isAuthenticated) return;
    
    const targetUserId = data.to || data.targetUserId;
    
    broadcastToUser(targetUserId, 'call:ice-candidate', {
      from: socket.userId,
      candidate: data.candidate,
      callId: data.callId
    });
  });

  socket.on('call:end', (data) => {
    if (!isAuthenticated) return;
    
    const targetUserId = data.to || data.targetUserId || data.callerId;
    
    broadcastToUser(targetUserId, 'call:ended', {
      from: socket.userId,
      callId: data.callId
    });
  });

  socket.on('call:reject', (data) => {
    if (!isAuthenticated) return;
    
    const targetUserId = data.callerId;
    
    broadcastToUser(targetUserId, 'call:rejected', {
      from: socket.userId,
      callId: data.callId
    });
  });

  // Déconnexion AMÉLIORÉE
  socket.on('disconnect', async (reason) => {
    console.log(`🔴 Déconnexion ${socket.id}: ${reason}`);
    
    if (isAuthenticated && userId) {
      // Retirer de la liste des connexions
      connectedUsers.delete(socket.id);
      const isLastConnection = removeUserSocket(userId, socket.id);
      
      // Si c'était la dernière connexion de l'utilisateur
      if (isLastConnection) {
        await updateUserStatus(userId, false, socket.id);
        console.log(`👤 ${userName} (${userId}) maintenant hors ligne`);
      } else {
        console.log(`👤 ${userName} (${userId}) toujours connecté sur ${getUserSockets(userId).size} socket(s)`);
      }
    }
  });

  // Gestion des erreurs
  socket.on('error', (error) => {
    console.error(`❌ Erreur Socket ${socket.id}:`, error);
  });
}

// Système de heartbeat pour détecter les connexions zombies
function startHeartbeatSystem() {
  heartbeatInterval = setInterval(() => {
    const now = new Date();
    const timeoutMs = 5 * 60 * 1000; // 5 minutes

    connectedUsers.forEach(async (user, socketId) => {
      const inactiveTime = now.getTime() - user.lastSeen.getTime();
      
      if (inactiveTime > timeoutMs) {
        console.log(`⏰ Connexion inactive détectée:`, {
          socketId,
          userId: user.userId,
          inactiveMinutes: Math.floor(inactiveTime / (1000 * 60))
        });
        
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
        }
      }
    });
  }, 60000); // Vérifier toutes les minutes

  console.log('💓 Système de heartbeat démarré');
}

// Routes API supplémentaires
function setupApiRoutes() {
  return (req, res) => {
    // Stats du serveur
    if (req.url === '/api/socket-stats' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'Socket.IO WebRTC Server avec Persistance',
        connectedUsers: connectedUsers.size,
        uniqueUsers: userSockets.size,
        totalConnections: Array.from(userSockets.values())
          .reduce((total, sockets) => total + sockets.size, 0),
        features: ['webrtc', 'persistence', 'offline-sync', 'status-tracking'],
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      }));
      return;
    }

    // Health check
    if (req.url === '/api/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        database: 'connected',
        socket: 'active',
        timestamp: new Date().toISOString()
      }));
      return;
    }

    // Forcer la synchronisation d'un utilisateur
    if (req.url.startsWith('/api/sync/') && req.method === 'POST') {
      const userId = req.url.split('/')[3];
      const sockets = getUserSockets(userId);
      
      sockets.forEach(socketId => {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit('sync:force', { timestamp: new Date().toISOString() });
        }
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        userId,
        socketsNotified: sockets.size
      }));
      return;
    }

    // Route par défaut Next.js
    handler(req, res);
  };
}

// Initialisation AMÉLIORÉE
app.prepare().then(async () => {
  console.log('✅ Next.js préparé');
  
  // Test de connexion à la base de données
  try {
    await prisma.$connect();
    console.log('✅ Base de données connectée');
  } catch (error) {
    console.error('❌ Erreur connexion base de données:', error);
    process.exit(1);
  }
  
  server = createServer(setupApiRoutes());
  
  io = new Server(server, {
    path: '/api/socketio',
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  console.log('✅ Socket.IO créé avec CORS configuré');

  io.on('connection', (socket) => {
    setupSocketHandlers(socket, io);
  });

  // Démarrer le système de heartbeat
  startHeartbeatSystem();

  server.listen(port, () => {
    console.log(`🚀 Serveur WebRTC avec persistance sur http://${hostname}:${port}`);
    console.log(`🔌 Socket.IO path: /api/socketio`);
    console.log(`📊 Stats: /api/socket-stats`);
    console.log(`🏥 Health: /api/health`);
    console.log(`💾 Persistance: ACTIVÉE`);
    console.log(`📡 WebRTC: ACTIVÉ`);
    console.log(`🔄 Sync offline: ACTIVÉ`);
  });

}).catch((err) => {
  console.error('💥 Erreur démarrage:', err);
  process.exit(1);
});

// Nettoyage propre à la fermeture
process.on('SIGINT', async () => {
  console.log('🛑 Arrêt du serveur...');
  
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  
  // Marquer tous les utilisateurs connectés comme hors ligne
  const connectedUserIds = Array.from(new Set(
    Array.from(connectedUsers.values()).map(user => user.userId)
  ));
  
  for (const userId of connectedUserIds) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { isOnline: false, lastSeen: new Date() }
      });
    } catch (error) {
      console.error(`❌ Erreur mise à jour statut ${userId}:`, error);
    }
  }
  
  await prisma.$disconnect();
  console.log('✅ Nettoyage terminé');
  process.exit(0);
});