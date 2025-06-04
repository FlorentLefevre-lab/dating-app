// src/services/OfflineMessageService.ts
import { useState, useEffect, useCallback, useRef } from 'react';

interface OfflineMessage {
  id: string;
  content: string;
  receiverId: string;
  conversationId: string;
  timestamp: string;
  clientId: string;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  retryCount: number;
  lastRetry?: string;
}

interface OfflineStats {
  total: number;
  pending: number;
  failed: number;
  sent: number;
}

const STORAGE_KEY = 'offline_messages';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000;

class OfflineMessageManager {
  private messages: OfflineMessage[] = [];
  private listeners: Array<(stats: OfflineStats) => void> = [];
  private syncInterval: number | null = null;

  constructor() {
    this.loadFromStorage();
    this.startPeriodicSync();
    
    // Écouter les changements de connectivité
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.messages = JSON.parse(stored);
        console.log('📦 [OFFLINE] Messages chargés:', this.messages.length);
      }
    } catch (error) {
      console.error('❌ [OFFLINE] Erreur chargement messages:', error);
      this.messages = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.messages));
    } catch (error) {
      console.error('❌ [OFFLINE] Erreur sauvegarde messages:', error);
    }
  }

  private notifyListeners(): void {
    const stats = this.getStats();
    this.listeners.forEach(listener => listener(stats));
  }

  private handleOnline(): void {
    console.log('🌐 [OFFLINE] Connexion détectée - Synchronisation...');
    this.syncPendingMessages();
  }

  private handleOffline(): void {
    console.log('📡 [OFFLINE] Mode hors ligne activé');
  }

  private startPeriodicSync(): void {
    this.syncInterval = window.setInterval(() => {
      if (navigator.onLine) {
        this.syncPendingMessages();
      }
    }, 30000); // Sync toutes les 30 secondes
  }

  public addMessage(message: Omit<OfflineMessage, 'id' | 'status' | 'retryCount'>): OfflineMessage {
    const offlineMessage: OfflineMessage = {
      ...message,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      retryCount: 0
    };

    this.messages.push(offlineMessage);
    this.saveToStorage();
    this.notifyListeners();

    console.log('📦 [OFFLINE] Message ajouté:', offlineMessage.id);

    // Essayer d'envoyer immédiatement si en ligne
    if (navigator.onLine) {
      this.sendMessage(offlineMessage);
    }

    return offlineMessage;
  }

  private async sendMessage(message: OfflineMessage): Promise<boolean> {
    try {
      message.status = 'sending';
      message.lastRetry = new Date().toISOString();
      this.saveToStorage();
      this.notifyListeners();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: message.content,
          receiverId: message.receiverId,
          conversationId: message.conversationId,
          clientMessageId: message.clientId,
          timestamp: message.timestamp
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          message.status = 'sent';
          console.log('✅ [OFFLINE] Message envoyé:', message.id);
          
          // Supprimer le message des messages offline après succès
          setTimeout(() => {
            this.removeMessage(message.id);
          }, 5000); // Garde 5 secondes pour confirmation
          
          return true;
        }
      }

      throw new Error(`HTTP ${response.status}`);

    } catch (error) {
      console.error('❌ [OFFLINE] Erreur envoi message:', error);
      
      message.retryCount++;
      if (message.retryCount >= MAX_RETRY_ATTEMPTS) {
        message.status = 'failed';
        console.error('💥 [OFFLINE] Message échoué définitivement:', message.id);
      } else {
        message.status = 'pending';
        console.log(`🔄 [OFFLINE] Nouvel essai ${message.retryCount}/${MAX_RETRY_ATTEMPTS} pour:`, message.id);
      }

      this.saveToStorage();
      this.notifyListeners();
      return false;
    }
  }

  public async syncPendingMessages(): Promise<void> {
    const pendingMessages = this.messages.filter(msg => 
      msg.status === 'pending' || msg.status === 'failed'
    );

    if (pendingMessages.length === 0) {
      return;
    }

    console.log(`🔄 [OFFLINE] Synchronisation de ${pendingMessages.length} messages...`);

    // Envoyer les messages en séquence pour éviter de surcharger le serveur
    for (const message of pendingMessages) {
      if (message.status === 'failed' && message.retryCount >= MAX_RETRY_ATTEMPTS) {
        continue; // Ignorer les messages définitivement échoués
      }

      await this.sendMessage(message);
      
      // Délai entre les envois pour éviter le spam
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  private removeMessage(messageId: string): void {
    const index = this.messages.findIndex(msg => msg.id === messageId);
    if (index !== -1) {
      this.messages.splice(index, 1);
      this.saveToStorage();
      this.notifyListeners();
      console.log('🗑️ [OFFLINE] Message supprimé:', messageId);
    }
  }

  public getStats(): OfflineStats {
    const stats = this.messages.reduce((acc, msg) => {
      acc.total++;
      acc[msg.status]++;
      return acc;
    }, { total: 0, pending: 0, failed: 0, sent: 0 });

    return stats;
  }

  public getMessage(messageId: string): OfflineMessage | undefined {
    return this.messages.find(msg => msg.id === messageId);
  }

  public getAllMessages(): OfflineMessage[] {
    return [...this.messages];
  }

  public clearFailedMessages(): void {
    this.messages = this.messages.filter(msg => msg.status !== 'failed');
    this.saveToStorage();
    this.notifyListeners();
    console.log('🧹 [OFFLINE] Messages échoués supprimés');
  }

  public retryFailedMessages(): void {
    const failedMessages = this.messages.filter(msg => msg.status === 'failed');
    failedMessages.forEach(msg => {
      msg.status = 'pending';
      msg.retryCount = 0;
    });
    
    this.saveToStorage();
    this.notifyListeners();
    
    if (navigator.onLine) {
      this.syncPendingMessages();
    }
    
    console.log(`🔄 [OFFLINE] ${failedMessages.length} messages remis en attente`);
  }

  public addListener(listener: (stats: OfflineStats) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    this.listeners = [];
  }
}

// Singleton instance
let offlineMessageManager: OfflineMessageManager | null = null;

export const getOfflineMessageManager = (): OfflineMessageManager => {
  if (!offlineMessageManager) {
    offlineMessageManager = new OfflineMessageManager();
  }
  return offlineMessageManager;
};

// Hook React pour utiliser le service
export const useOfflineMessages = () => {
  const [offlineStats, setOfflineStats] = useState<OfflineStats>({
    total: 0,
    pending: 0,
    failed: 0,
    sent: 0
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator?.onLine ?? true);
  
  const managerRef = useRef<OfflineMessageManager>();

  useEffect(() => {
    managerRef.current = getOfflineMessageManager();
    
    // Mettre à jour les stats initiales
    setOfflineStats(managerRef.current.getStats());
    
    // Écouter les changements de stats
    const unsubscribe = managerRef.current.addListener(setOfflineStats);
    
    // Écouter les changements de connectivité
    const handleOnlineChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnlineChange);
    window.addEventListener('offline', handleOnlineChange);
    
    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnlineChange);
      window.removeEventListener('offline', handleOnlineChange);
    };
  }, []);

  const addOfflineMessage = useCallback((message: {
    content: string;
    receiverId: string;
    conversationId: string;
    clientId: string;
    timestamp: string;
  }) => {
    if (managerRef.current) {
      return managerRef.current.addMessage(message);
    }
    return null;
  }, []);

  const syncMessages = useCallback(async () => {
    if (managerRef.current && !isSyncing) {
      setIsSyncing(true);
      try {
        await managerRef.current.syncPendingMessages();
      } finally {
        setIsSyncing(false);
      }
    }
  }, [isSyncing]);

  const refreshStats = useCallback(() => {
    if (managerRef.current) {
      setOfflineStats(managerRef.current.getStats());
    }
  }, []);

  const clearFailedMessages = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.clearFailedMessages();
    }
  }, []);

  const retryFailedMessages = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.retryFailedMessages();
    }
  }, []);

  return {
    offlineStats,
    isSyncing,
    isOnline,
    addOfflineMessage,
    syncMessages,
    refreshStats,
    clearFailedMessages,
    retryFailedMessages
  };
};