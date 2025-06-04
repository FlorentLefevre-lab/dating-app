// src/lib/offline-storage.ts
import Dexie, { Table } from 'dexie';

interface OfflineMessage {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  conversationId: string;
  timestamp: string;
  status: 'pending' | 'sent' | 'failed';
  retryCount: number;
  createdAt: Date;
  syncedAt?: Date;
}

interface OfflineConversation {
  id: string;
  users: any[];
  lastMessage?: any;
  unreadCount: number;
  lastSyncedAt: Date;
}

interface SyncQueue {
  id: string;
  type: 'message' | 'read' | 'typing';
  data: any;
  timestamp: Date;
  retries: number;
}

class ChatOfflineStorage extends Dexie {
  messages!: Table<OfflineMessage>;
  conversations!: Table<OfflineConversation>;
  syncQueue!: Table<SyncQueue>;

  constructor() {
    super('ChatOfflineDB');
    
    this.version(1).stores({
      messages: '++id, conversationId, senderId, receiverId, timestamp, status',
      conversations: '++id, lastSyncedAt',
      syncQueue: '++id, type, timestamp'
    });
  }

  // Sauvegarder un message en attente
  async saveOfflineMessage(message: Omit<OfflineMessage, 'id' | 'createdAt' | 'retryCount'>) {
    return await this.messages.add({
      ...message,
      status: 'pending',
      retryCount: 0,
      createdAt: new Date()
    });
  }

  // Récupérer les messages non synchronisés
  async getPendingMessages(conversationId?: string) {
    let query = this.messages.where('status').equals('pending');
    if (conversationId) {
      query = query.and(msg => msg.conversationId === conversationId);
    }
    return await query.toArray();
  }

  // Marquer un message comme envoyé
  async markMessageAsSent(messageId: string, serverMessageId?: string) {
    await this.messages.update(messageId, { 
      status: 'sent',
      syncedAt: new Date(),
      id: serverMessageId || messageId
    });
  }

  // Incrémenter le compteur de retry
  async incrementRetryCount(messageId: string) {
    const message = await this.messages.get(messageId);
    if (message) {
      await this.messages.update(messageId, {
        retryCount: message.retryCount + 1,
        status: message.retryCount >= 3 ? 'failed' : 'pending'
      });
    }
  }

  // Sauvegarder une conversation
  async saveConversation(conversation: OfflineConversation) {
    const existing = await this.conversations.get(conversation.id);
    if (existing) {
      await this.conversations.update(conversation.id, conversation);
    } else {
      await this.conversations.add(conversation);
    }
  }

  // Ajouter à la queue de synchronisation
  async addToSyncQueue(item: Omit<SyncQueue, 'id' | 'timestamp' | 'retries'>) {
    return await this.syncQueue.add({
      ...item,
      timestamp: new Date(),
      retries: 0
    });
  }

  // Récupérer les éléments à synchroniser
  async getSyncQueueItems() {
    return await this.syncQueue.orderBy('timestamp').toArray();
  }

  // Nettoyer les données anciennes
  async cleanup(daysToKeep: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    await this.messages
      .where('createdAt')
      .below(cutoffDate)
      .and(msg => msg.status === 'sent')
      .delete();

    await this.syncQueue
      .where('timestamp')
      .below(cutoffDate)
      .delete();
  }
}

// Instance singleton
export const offlineDB = new ChatOfflineStorage();

// Service de synchronisation
export class OfflineSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.triggerSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.stopPeriodicSync();
    });
  }

  // Démarrer la synchronisation périodique
  startPeriodicSync(intervalMs: number = 30000) {
    if (this.syncInterval) return;
    
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.triggerSync();
      }
    }, intervalMs);
  }

  // Arrêter la synchronisation périodique
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Déclencher une synchronisation
  async triggerSync() {
    if (!this.isOnline || this.syncInProgress) return;

    this.syncInProgress = true;
    console.log('🔄 Démarrage synchronisation offline...');

    try {
      // 1. Synchroniser les messages en attente
      await this.syncPendingMessages();
      
      // 2. Synchroniser la queue
      await this.processSyncQueue();
      
      // 3. Récupérer les messages manqués
      await this.fetchMissedMessages();
      
      // 4. Nettoyer les anciennes données
      await offlineDB.cleanup();

      console.log('✅ Synchronisation terminée');
    } catch (error) {
      console.error('❌ Erreur synchronisation:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Synchroniser les messages en attente
  private async syncPendingMessages() {
    const pendingMessages = await offlineDB.getPendingMessages();
    
    for (const message of pendingMessages) {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: message.content,
            receiverId: message.receiverId,
            conversationId: message.conversationId,
            clientMessageId: message.id,
            timestamp: message.timestamp
          })
        });

        if (response.ok) {
          const data = await response.json();
          await offlineDB.markMessageAsSent(message.id, data.message.id);
        } else {
          await offlineDB.incrementRetryCount(message.id);
        }
      } catch (error) {
        await offlineDB.incrementRetryCount(message.id);
      }
    }
  }

  // Traiter la queue de synchronisation
  private async processSyncQueue() {
    const items = await offlineDB.getSyncQueueItems();
    
    for (const item of items) {
      try {
        switch (item.type) {
          case 'read':
            await this.syncReadStatus(item.data);
            break;
          case 'typing':
            // Ignorer les indicateurs de frappe anciens
            if (Date.now() - item.timestamp.getTime() < 5000) {
              await this.syncTypingIndicator(item.data);
            }
            break;
        }
        
        await offlineDB.syncQueue.delete(item.id);
      } catch (error) {
        item.retries++;
        if (item.retries >= 3) {
          await offlineDB.syncQueue.delete(item.id);
        } else {
          await offlineDB.syncQueue.update(item.id, { retries: item.retries });
        }
      }
    }
  }

  // Récupérer les messages manqués
  private async fetchMissedMessages() {
    const conversations = await offlineDB.conversations.toArray();
    
    for (const conversation of conversations) {
      try {
        const response = await fetch('/api/chat', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lastSyncTimestamp: conversation.lastSyncedAt.toISOString(),
            conversationId: conversation.id
          })
        });

        if (response.ok) {
          const data = await response.json();
          // Traiter les messages reçus
          if (data.missedMessages?.length > 0) {
            // Émettre un événement pour mettre à jour l'UI
            window.dispatchEvent(new CustomEvent('offline-messages-synced', {
              detail: { conversationId: conversation.id, messages: data.missedMessages }
            }));
          }
          
          // Mettre à jour le timestamp de sync
          await offlineDB.conversations.update(conversation.id, {
            lastSyncedAt: new Date()
          });
        }
      } catch (error) {
        console.error('Erreur sync conversation:', conversation.id, error);
      }
    }
  }

  // Synchroniser le statut de lecture
  private async syncReadStatus(data: any) {
    await fetch('/api/messages/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }

  // Synchroniser l'indicateur de frappe
  private async syncTypingIndicator(data: any) {
    // Implémenter si nécessaire
  }
}

// Instance du service
export const offlineSyncService = new OfflineSyncService();