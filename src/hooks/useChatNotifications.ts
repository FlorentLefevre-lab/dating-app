// src/hooks/useChatNotifications.ts
// Hook pour gérer les notifications sonores et visuelles du chat

import { useEffect, useCallback, useRef, useState } from 'react';
import type { StreamChat, Event } from 'stream-chat';

// AudioContext partagé pour éviter les problèmes d'autoplay
let sharedAudioContext: AudioContext | null = null;
let audioUnlocked = false;

// Débloquer l'audio après une interaction utilisateur
const unlockAudio = () => {
  if (audioUnlocked) return;

  try {
    sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume();
    }
    audioUnlocked = true;

    // Retirer les listeners après déblocage
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('touchstart', unlockAudio);
    document.removeEventListener('keydown', unlockAudio);
  } catch (e) {
    // Silently fail
  }
};

// Ajouter les listeners pour débloquer l'audio
if (typeof window !== 'undefined') {
  document.addEventListener('click', unlockAudio, { once: false });
  document.addEventListener('touchstart', unlockAudio, { once: false });
  document.addEventListener('keydown', unlockAudio, { once: false });
}

// Générer un son de notification avec Web Audio API
const playWebAudioBeep = (volume: number = 0.5): Promise<void> => {
  return new Promise((resolve) => {
    try {
      // Utiliser le contexte partagé ou en créer un nouveau
      const audioContext = sharedAudioContext || new (window.AudioContext || (window as any).webkitAudioContext)();

      // Résumer si suspendu
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      // Créer un oscillateur pour un son agréable
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Son de notification doux (deux notes)
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // Note A5
      oscillator.frequency.setValueAtTime(1108.73, audioContext.currentTime + 0.1); // Note C#6

      oscillator.type = 'sine';

      // Envelope pour un son doux
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume * 0.3, audioContext.currentTime + 0.02);
      gainNode.gain.linearRampToValueAtTime(volume * 0.2, audioContext.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);

      setTimeout(() => {
        // Ne pas fermer le contexte partagé
        if (!sharedAudioContext) {
          audioContext.close();
        }
        resolve();
      }, 350);
    } catch (error) {
      resolve();
    }
  });
};

// Jouer le son de notification (utilise directement Web Audio API)
const playNotificationBeep = async (volume: number = 0.5) => {
  try {
    await playWebAudioBeep(volume);
  } catch (error) {
    // Silently fail
  }
};


interface UseChatNotificationsOptions {
  enabled?: boolean;
  soundEnabled?: boolean;
  browserNotificationsEnabled?: boolean;
  volume?: number;
}

interface UseChatNotificationsReturn {
  notificationPermission: NotificationPermission | 'unsupported';
  requestPermission: () => Promise<void>;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  browserNotificationsEnabled: boolean;
  setBrowserNotificationsEnabled: (enabled: boolean) => void;
  testSound: () => Promise<void>;
}

export function useChatNotifications(
  client: StreamChat | null,
  options: UseChatNotificationsOptions = {}
): UseChatNotificationsReturn {
  const {
    enabled = true,
    soundEnabled: initialSoundEnabled = true,
    browserNotificationsEnabled: initialBrowserEnabled = true,
    volume = 0.5
  } = options;

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [soundEnabled, setSoundEnabled] = useState(initialSoundEnabled);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(initialBrowserEnabled);

  // Référence pour éviter les notifications pour ses propres messages
  const currentUserIdRef = useRef<string | null>(null);

  // Vérifier le support des notifications au montage et demander la permission automatiquement
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const currentPermission = Notification.permission;
      setNotificationPermission(currentPermission);

      // Demander automatiquement la permission si pas encore demandée
      if (currentPermission === 'default') {
        Notification.requestPermission().then((permission) => {
          setNotificationPermission(permission);
        });
      }
    } else {
      setNotificationPermission('unsupported');
    }
  }, []);

  // Mettre à jour l'ID utilisateur courant
  useEffect(() => {
    if (client?.userID) {
      currentUserIdRef.current = client.userID;
    }
  }, [client?.userID]);

  // Demander la permission pour les notifications
  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    } catch (error) {
      // Silently fail
    }
  }, []);

  // Afficher une notification navigateur
  const showBrowserNotification = useCallback((title: string, body: string, icon?: string) => {
    if (notificationPermission !== 'granted' || !browserNotificationsEnabled) {
      return;
    }

    try {
      const notification = new Notification(title, {
        body,
        icon: icon || '/default-avatar.png',
        tag: 'flow-dating-chat',
        renotify: true
      });

      // Fermer automatiquement après 5 secondes
      setTimeout(() => notification.close(), 5000);

      // Focus sur la fenêtre au clic
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      // Silently fail
    }
  }, [notificationPermission, browserNotificationsEnabled]);

  // Jouer le son de notification
  const playNotificationSound = useCallback(async () => {
    if (!soundEnabled) return;
    await playNotificationBeep(volume);
  }, [soundEnabled, volume]);

  // Tester le son (joue toujours, même si soundEnabled est false)
  const testSound = useCallback(async () => {
    await playNotificationBeep(volume);
  }, [volume]);

  // Écouter les nouveaux messages
  useEffect(() => {
    if (!client || !enabled) return;

    const handleNewMessage = async (event: Event) => {
      // Ignorer ses propres messages
      if (event.user?.id === currentUserIdRef.current) {
        return;
      }

      // Ignorer si pas de message et pas de pièce jointe
      const hasText = !!event.message?.text;
      const hasAttachments = event.message?.attachments && event.message.attachments.length > 0;

      if (!hasText && !hasAttachments) {
        return;
      }

      const senderName = event.user?.name || event.user?.id || 'Quelqu\'un';

      // Construire le preview du message
      let messagePreview: string;
      if (hasText) {
        messagePreview = event.message!.text!.length > 50
          ? event.message!.text!.substring(0, 50) + '...'
          : event.message!.text!;
      } else if (hasAttachments) {
        const attachmentType = event.message!.attachments![0].type;
        if (attachmentType === 'image') {
          messagePreview = '📷 Photo';
        } else if (attachmentType === 'video') {
          messagePreview = '🎥 Vidéo';
        } else if (attachmentType === 'audio') {
          messagePreview = '🎵 Audio';
        } else {
          messagePreview = '📎 Fichier';
        }
      } else {
        messagePreview = 'Nouveau message';
      }

      // Jouer le son
      await playNotificationSound();

      // Afficher la notification navigateur
      showBrowserNotification(
        `Nouveau message de ${senderName}`,
        messagePreview,
        event.user?.image
      );
    };

    // S'abonner à l'événement message.new
    client.on('message.new', handleNewMessage);

    return () => {
      client.off('message.new', handleNewMessage);
    };
  }, [client, enabled, playNotificationSound, showBrowserNotification]);

  // Mettre à jour le titre de la page avec le nombre de messages non lus
  useEffect(() => {
    if (!client || !enabled) return;

    const updateTitle = () => {
      try {
        let totalUnread = 0;
        if (client.state && client.state.channels) {
          const channelValues = Object.values(client.state.channels);
          for (const channel of channelValues) {
            if (channel?.state?.unreadCount) {
              totalUnread += channel.state.unreadCount;
            }
          }
        }

        const baseTitle = 'Chat - Flow Dating';
        if (totalUnread > 0) {
          document.title = `(${totalUnread}) ${baseTitle}`;
        } else {
          document.title = baseTitle;
        }
      } catch (error) {
        // Silently fail
      }
    };

    // Mettre à jour au changement de messages non lus
    client.on('message.new', updateTitle);
    client.on('message.read', updateTitle);

    // Initial update
    updateTitle();

    return () => {
      client.off('message.new', updateTitle);
      client.off('message.read', updateTitle);
      document.title = 'Flow Dating';
    };
  }, [client, enabled]);

  return {
    notificationPermission,
    requestPermission,
    soundEnabled,
    setSoundEnabled,
    browserNotificationsEnabled,
    setBrowserNotificationsEnabled,
    testSound
  };
}

export default useChatNotifications;
