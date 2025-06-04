// src/lib/notification-service.ts
class NotificationService {
    private permission: NotificationPermission = 'default';
    private audioElement: HTMLAudioElement | null = null;
  
    constructor() {
      this.init();
    }
  
    async init() {
      // Charger le son de notification
      if (typeof window !== 'undefined') {
        this.audioElement = new Audio('/sounds/notification.mp3');
        this.audioElement.volume = 0.5;
      }
  
      // Vérifier si les notifications sont supportées
      if ('Notification' in window) {
        this.permission = Notification.permission;
      }
    }
  
    // Demander la permission pour les notifications
    async requestPermission(): Promise<boolean> {
      if (!('Notification' in window)) {
        console.log('Les notifications ne sont pas supportées');
        return false;
      }
  
      if (Notification.permission === 'granted') {
        return true;
      }
  
      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        this.permission = permission;
        return permission === 'granted';
      }
  
      return false;
    }
  
    // Afficher une notification
    async showNotification(
      title: string,
      options?: NotificationOptions & {
        userId?: string;
        conversationId?: string;
        playSound?: boolean;
      }
    ): Promise<void> {
      // Vérifier que l'onglet n'est pas actif
      if (document.hasFocus()) {
        console.log('Onglet actif, pas de notification');
        return;
      }
  
      // Jouer le son si demandé
      if (options?.playSound !== false && this.audioElement) {
        try {
          await this.audioElement.play();
        } catch (error) {
          console.log('Impossible de jouer le son:', error);
        }
      }
  
      // Vérifier la permission
      if (this.permission !== 'granted') {
        const granted = await this.requestPermission();
        if (!granted) return;
      }
  
      // Créer la notification
      try {
        const notification = new Notification(title, {
          icon: '/icon-192x192.png',
          badge: '/icon-72x72.png',
          tag: options?.conversationId || 'default',
          renotify: true,
          requireInteraction: false,
          silent: options?.playSound === false,
          ...options
        });
  
        // Gérer le clic sur la notification
        notification.onclick = (event) => {
          event.preventDefault();
          window.focus();
          notification.close();
  
          // Rediriger vers la conversation si possible
          if (options?.userId) {
            window.location.href = `/chat?userId=${options.userId}`;
          }
        };
  
        // Fermer automatiquement après 5 secondes
        setTimeout(() => notification.close(), 5000);
  
      } catch (error) {
        console.error('Erreur création notification:', error);
      }
    }
  
    // Notification pour un nouveau message
    async notifyNewMessage(
      senderName: string,
      message: string,
      senderImage?: string,
      senderId?: string,
      conversationId?: string
    ): Promise<void> {
      await this.showNotification(
        senderName,
        {
          body: message,
          icon: senderImage || '/default-avatar.png',
          userId: senderId,
          conversationId,
          playSound: true
        }
      );
    }
  
    // Notification pour un appel entrant
    async notifyIncomingCall(
      callerName: string,
      isVideo: boolean,
      callerImage?: string,
      callerId?: string
    ): Promise<void> {
      await this.showNotification(
        `Appel ${isVideo ? 'vidéo' : 'audio'} entrant`,
        {
          body: `${callerName} vous appelle`,
          icon: callerImage || '/default-avatar.png',
          userId: callerId,
          requireInteraction: true,
          playSound: true,
          tag: 'call'
        }
      );
    }
  
    // Vérifier si les notifications sont activées
    isEnabled(): boolean {
      return this.permission === 'granted';
    }
  
    // Obtenir le statut des permissions
    getPermissionStatus(): NotificationPermission {
      return this.permission;
    }
  
    // Mettre à jour le volume du son
    setVolume(volume: number): void {
      if (this.audioElement) {
        this.audioElement.volume = Math.max(0, Math.min(1, volume));
      }
    }
  
    // Activer/désactiver le son
    setSoundEnabled(enabled: boolean): void {
      if (this.audioElement) {
        this.audioElement.muted = !enabled;
      }
    }
  }
  
  // Instance singleton
  export const notificationService = new NotificationService();
  
  // Hook React pour les notifications
  import { useEffect, useState } from 'react';
  
  export function useNotifications() {
    const [isEnabled, setIsEnabled] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>('default');
  
    useEffect(() => {
      setIsEnabled(notificationService.isEnabled());
      setPermission(notificationService.getPermissionStatus());
    }, []);
  
    const requestPermission = async () => {
      const granted = await notificationService.requestPermission();
      setIsEnabled(granted);
      setPermission(notificationService.getPermissionStatus());
      return granted;
    };
  
    return {
      isEnabled,
      permission,
      requestPermission,
      notifyNewMessage: notificationService.notifyNewMessage.bind(notificationService),
      notifyIncomingCall: notificationService.notifyIncomingCall.bind(notificationService),
      setVolume: notificationService.setVolume.bind(notificationService),
      setSoundEnabled: notificationService.setSoundEnabled.bind(notificationService)
    };
  }