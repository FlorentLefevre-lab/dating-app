// src/services/UserStatusService.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';

interface UserStatus {
  userId: string;
  isOnline: boolean;
  lastSeen: string;
  status?: 'online' | 'away' | 'busy' | 'offline';
}

interface StatusUpdate {
  userId: string;
  isOnline: boolean;
  lastSeen: string;
  status?: string;
}

class UserStatusManager {
  private statuses: Map<string, UserStatus> = new Map();
  private listeners: Array<(statuses: Map<string, UserStatus>) => void> = [];
  private socket: Socket | null = null;
  private heartbeatInterval: number | null = null;
  private currentUserId: string | null = null;

  public setSocket(socket: Socket): void {
    this.socket = socket;
    this.setupSocketListeners();
  }

  public setCurrentUserId(userId: string): void {
    this.currentUserId = userId;
    this.startHeartbeat();
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('user:status-update', (data: StatusUpdate) => {
      this.updateUserStatus(data.userId, {
        userId: data.userId,
        isOnline: data.isOnline,
        lastSeen: data.lastSeen,
        status: data.status as any
      });
    });

    this.socket.on('user:status-bulk', (data: StatusUpdate[]) => {
      data.forEach(status => {
        this.updateUserStatus(status.userId, {
          userId: status.userId,
          isOnline: status.isOnline,
          lastSeen: status.lastSeen,
          status: status.status as any
        });
      });
    });

    this.socket.on('user:went-offline', (data: { userId: string; lastSeen: string }) => {
      this.updateUserStatus(data.userId, {
        userId: data.userId,
        isOnline: false,
        lastSeen: data.lastSeen,
        status: 'offline'
      });
    });

    this.socket.on('user:came-online', (data: { userId: string }) => {
      this.updateUserStatus(data.userId, {
        userId: data.userId,
        isOnline: true,
        lastSeen: new Date().toISOString(),
        status: 'online'
      });
    });

    console.log('👤 [STATUS] Listeners Socket.IO configurés');
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval || !this.socket || !this.currentUserId) return;

    // Envoyer le statut immédiatement
    this.sendHeartbeat();

    // Puis toutes les 30 secondes
    this.heartbeatInterval = window.setInterval(() => {
      this.sendHeartbeat();
    }, 30000);

    console.log('💓 [STATUS] Heartbeat démarré');
  }

  private sendHeartbeat(): void {
    if (!this.socket || !this.currentUserId) return;

    this.socket.emit('user:heartbeat', {
      userId: this.currentUserId,
      timestamp: new Date().toISOString(),
      status: 'online'
    });
  }

  public requestUserStatus(userId: string): void {
    if (this.socket) {
      this.socket.emit('user:request-status', { userId });
    }
  }

  public requestMultipleUserStatuses(userIds: string[]): void {
    if (this.socket) {
      this.socket.emit('user:request-multiple-statuses', { userIds });
    }
  }

  private updateUserStatus(userId: string, status: UserStatus): void {
    this.statuses.set(userId, status);
    this.notifyListeners();
    
    console.log('👤 [STATUS] Mise à jour:', {
      userId,
      isOnline: status.isOnline,
      status: status.status
    });
  }

  public getUserStatus(userId: string): UserStatus | null {
    return this.statuses.get(userId) || null;
  }

  public getAllStatuses(): Map<string, UserStatus> {
    return new Map(this.statuses);
  }

  public isUserOnline(userId: string): boolean {
    const status = this.statuses.get(userId);
    return status?.isOnline ?? false;
  }

  public getLastSeen(userId: string): string | null {
    const status = this.statuses.get(userId);
    return status?.lastSeen || null;
  }

  public setUserStatus(status: 'online' | 'away' | 'busy' | 'offline'): void {
    if (!this.socket || !this.currentUserId) return;

    this.socket.emit('user:status-change', {
      userId: this.currentUserId,
      status,
      timestamp: new Date().toISOString()
    });

    // Mettre à jour localement aussi
    this.updateUserStatus(this.currentUserId, {
      userId: this.currentUserId,
      isOnline: status !== 'offline',
      lastSeen: new Date().toISOString(),
      status
    });
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(new Map(this.statuses)));
  }

  public addListener(listener: (statuses: Map<string, UserStatus>) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.socket && this.currentUserId) {
      // Signaler que l'utilisateur se déconnecte
      this.socket.emit('user:going-offline', {
        userId: this.currentUserId,
        timestamp: new Date().toISOString()
      });
    }

    this.listeners = [];
    this.statuses.clear();
    this.socket = null;
    this.currentUserId = null;
    
    console.log('🧹 [STATUS] Service détruit');
  }
}

// Singleton instance
let userStatusManager: UserStatusManager | null = null;

export const getUserStatusManager = (): UserStatusManager => {
  if (!userStatusManager) {
    userStatusManager = new UserStatusManager();
  }
  return userStatusManager;
};

// Hook React pour utiliser le service
export const useUserStatus = (currentUserId?: string) => {
  const [userStatuses, setUserStatuses] = useState<Map<string, UserStatus>>(new Map());
  const [isInitialized, setIsInitialized] = useState(false);
  const managerRef = useRef<UserStatusManager>();

  useEffect(() => {
    managerRef.current = getUserStatusManager();
    
    if (currentUserId) {
      managerRef.current.setCurrentUserId(currentUserId);
    }
    
    // Écouter les changements de statuts
    const unsubscribe = managerRef.current.addListener(setUserStatuses);
    setIsInitialized(true);
    
    return () => {
      unsubscribe();
    };
  }, [currentUserId]);

  const setSocket = useCallback((socket: Socket) => {
    if (managerRef.current) {
      managerRef.current.setSocket(socket);
    }
  }, []);

  const requestUserStatus = useCallback((userId: string) => {
    if (managerRef.current) {
      managerRef.current.requestUserStatus(userId);
    }
  }, []);

  const requestMultipleUserStatuses = useCallback((userIds: string[]) => {
    if (managerRef.current) {
      managerRef.current.requestMultipleUserStatuses(userIds);
    }
  }, []);

  const setUserStatus = useCallback((status: 'online' | 'away' | 'busy' | 'offline') => {
    if (managerRef.current) {
      managerRef.current.setUserStatus(status);
    }
  }, []);

  const getUserStatus = useCallback((userId: string): UserStatus | null => {
    if (managerRef.current) {
      return managerRef.current.getUserStatus(userId);
    }
    return null;
  }, []);

  const isUserOnline = useCallback((userId: string): boolean => {
    if (managerRef.current) {
      return managerRef.current.isUserOnline(userId);
    }
    return false;
  }, []);

  const getLastSeen = useCallback((userId: string): string | null => {
    if (managerRef.current) {
      return managerRef.current.getLastSeen(userId);
    }
    return null;
  }, []);

  const formatLastSeen = useCallback((userId: string): string => {
    const lastSeen = getLastSeen(userId);
    if (!lastSeen) return 'Jamais vu';

    const now = new Date();
    const date = new Date(lastSeen);
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'À l\'instant';
    if (diffMinutes < 60) return `Il y a ${diffMinutes}min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    
    return date.toLocaleDateString();
  }, [getLastSeen]);

  return {
    userStatuses,
    isInitialized,
    setSocket,
    requestUserStatus,
    requestMultipleUserStatuses,
    setUserStatus,
    getUserStatus,
    isUserOnline,
    getLastSeen,
    formatLastSeen
  };
};