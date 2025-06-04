import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Send, 
  Phone, 
  Video, 
  MoreVertical, 
  Smile, 
  Paperclip,
  CheckCheck,
  Check,
  Clock,
  AlertCircle,
  Wifi,
  WifiOff,
  RefreshCw,
  Archive,
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  VideoOff as VideoOffIcon,
  X,
  UserCheck,
  UserX,
  Bell,
  BellOff
} from 'lucide-react';
import { useEnhancedSocket } from '@/hooks/useEnhancedSocket';
import EmojiPicker from './EmojiPicker';

interface User {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  age?: number;
  bio?: string;
  location?: string;
}

interface FinalChatSystemProps {
  currentUser: User;
  remoteUser: User;
  onClose?: () => void;
}

export const ChatSystem: React.FC<FinalChatSystemProps> = ({
  currentUser,
  remoteUser,
  onClose
}) => {
  // ✅ CORRECTION: Générer l'ID de conversation
  const conversationId = useMemo(() => {
    // Créer un ID unique basé sur les deux utilisateurs
    const userIds = [currentUser.id, remoteUser.id].sort();
    return `conv_${userIds.join('_')}`;
  }, [currentUser.id, remoteUser.id]);

  // Hook Socket amélioré
  const {
    socket,
    isConnected,
    isAuthenticated,
    connectionError,
    isOnline,
    socketStats,
    messages,
    setMessages,
    offlineMessages,
    sendMessage,
    userStatuses,
    typingUsers,
    requestUserStatus,
    sendTypingIndicator,
    sendStoppedTyping,
    incomingCall,
    isInCall,
    setIncomingCall,
    setIsInCall,
    testConnection,
    syncMessages,
    syncOfflineMessages,
    getOfflineStats
  } = useEnhancedSocket(currentUser.id, currentUser.name);

  // États locaux
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showCallInterface, setShowCallInterface] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [newMessageAlert, setNewMessageAlert] = useState<{show: boolean; message: string; sender: string}>({show: false, message: '', sender: ''});
  const [unreadInBackground, setUnreadInBackground] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // WebRTC
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // ✅ CORRECTION: Fonction d'ajout d'emoji manquante
  const handleEmojiSelect = useCallback((emoji: string) => {
    setMessageInput(prev => prev + emoji);
    setShowEmojiPicker(false);
    // Remettre le focus sur l'input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  // Réinitialiser le compteur quand on revient sur la page
  useEffect(() => {
    const handleFocus = () => {
      setUnreadInBackground(0);
      document.title = 'Chat'; // Titre original
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Vérifier les permissions de notification au montage
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Demander la permission pour les notifications
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      console.log('Permission notifications:', permission);
    }
  };

  // Fonction de test pour les notifications
  const testNotification = () => {
    console.log('🧪 Test notification - État actuel:', {
      supported: 'Notification' in window,
      permission: Notification.permission,
      hasFocus: document.hasFocus(),
      visibility: document.visibilityState
    });

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        // Forcer le blur pour le test
        window.blur();
        
        setTimeout(() => {
          const notification = new Notification('Test de notification 🔔', {
            body: 'Si vous voyez ceci, les notifications fonctionnent !',
            icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGRjAwNzciLz4KPHBhdGggZD0iTTI4IDEzTDI0IDI3SDE2TDEyIDEzIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4=',
            badge: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGRjAwNzciLz4KPC9zdmc+',
            requireInteraction: true, // Garde la notification visible
            tag: 'test-' + Date.now()
          });

          notification.onclick = () => {
            window.focus();
            notification.close();
            console.log('👆 Notification cliquée');
          };

          // Log plus détaillé
          console.log('✅ Notification créée:', notification);
          
          // Fermer après 10 secondes
          setTimeout(() => {
            notification.close();
            console.log('🔕 Notification fermée automatiquement');
          }, 10000);
          
        }, 100); // Petit délai après le blur
        
      } catch (error) {
        console.error('❌ Erreur création notification:', error);
        alert('Erreur notification: ' + error.message);
      }
    } else {
      alert('Les notifications ne sont pas disponibles ou autorisées');
    }
  };

  // Charger les messages depuis l'API au montage et lors des changements
  useEffect(() => {
    const loadMessages = async () => {
      setIsLoadingMessages(true);
      
      try {
        console.log('📚 Chargement des messages pour:', remoteUser.id);
        const response = await fetch(`/api/chat?otherUserId=${remoteUser.id}&limit=50`);
        const data = await response.json();
        
        if (data.success && data.messages) {
          const formattedMessages = data.messages.map((msg: any) => ({
            id: msg.id,
            content: msg.content,
            senderId: msg.senderId,
            receiverId: msg.receiverId,
            timestamp: msg.createdAt || msg.timestamp,
            fromCurrentUser: msg.senderId === currentUser.id,
            status: msg.status || (msg.readAt ? 'read' : 'delivered'),
            clientId: msg.clientId,
            sender: msg.sender
          }));
          
          setMessages(formattedMessages);
          console.log('✅ Messages chargés:', formattedMessages.length);
        }
      } catch (error) {
        console.error('❌ Erreur chargement messages:', error);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadMessages();
  }, [remoteUser.id, currentUser.id, setMessages]);

  // Synchronisation périodique avec le serveur - DÉSACTIVÉE pour éviter les doublons
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     syncMessages();
  //   }, 5000); // Toutes les 5 secondes

  //   return () => clearInterval(interval);
  // }, [syncMessages]);

  // Auto-scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Demander le statut de l'utilisateur distant
  useEffect(() => {
    if (socket && isAuthenticated) {
      requestUserStatus(remoteUser.id);
      
      // Redemander le statut toutes les 30 secondes
      const interval = setInterval(() => {
        requestUserStatus(remoteUser.id);
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [socket, isAuthenticated, remoteUser.id, requestUserStatus]);

  // Gestion des appels entrants
  useEffect(() => {
    if (incomingCall && !isInCall) {
      setShowCallInterface(true);
      setCallType(incomingCall.isVideoCall ? 'video' : 'audio');
      
      // Notification native pour l'appel entrant
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`Appel ${incomingCall.isVideoCall ? 'vidéo' : 'audio'} entrant`, {
          body: `${incomingCall.callerName || 'Quelqu\'un'} vous appelle`,
          icon: remoteUser.image || '/default-avatar.png'
        });
      }
    }
  }, [incomingCall, isInCall, remoteUser.image]);

  // Écouter les messages reçus spécifiquement pour cette conversation
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data: any) => {
      // Vérifier que le message concerne cette conversation
      if ((data.senderId === remoteUser.id && data.receiverId === currentUser.id) ||
          (data.senderId === currentUser.id && data.receiverId === remoteUser.id)) {
        
        console.log('📨 Nouveau message pour cette conversation:', data);
        
        // Ne pas ajouter nos propres messages (ils sont déjà dans le state)
        if (data.senderId === currentUser.id) {
          // Juste mettre à jour le statut si c'est notre message
          setMessages(prev => prev.map(msg => 
            (msg.clientId === data.clientId || msg.id === data.id)
              ? { ...msg, id: data.id, status: 'delivered' as const }
              : msg
          ));
          return;
        }
        
        const newMessage = {
          id: data.id || data.messageId,
          content: data.content,
          senderId: data.senderId,
          receiverId: data.receiverId,
          timestamp: data.timestamp,
          fromCurrentUser: false,
          status: 'delivered' as const,
          sender: data.sender
        };

        setMessages(prev => {
          // Éviter les doublons
          const exists = prev.some(m => m.id === newMessage.id);
          if (exists) return prev;
          
          return [...prev, newMessage];
        });

        // Jouer un son de notification
        try {
          // Son en ligne temporaire (remplacez par votre propre fichier)
          const audio = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAADhfX19fX19fX19fX19');
          audio.volume = 0.3;
          audio.play().catch(e => console.log('Son non joué:', e));
        } catch (e) {
          console.log('Erreur audio:', e);
        }
        
        // Mettre à jour le titre de la page
        if (!document.hasFocus()) {
          setUnreadInBackground(prev => prev + 1);
          document.title = `(${unreadInBackground + 1}) Nouveau message - ${remoteUser.name}`;
        }
        
        // Notification système (tentative)
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            const notification = new Notification(data.sender?.name || 'Nouveau message', {
              body: data.content.substring(0, 100),
              icon: data.sender?.image || '/default-avatar.png',
              tag: `msg-${Date.now()}`
            });
            
            setTimeout(() => notification.close(), 4000);
            
            notification.onclick = () => {
              window.focus();
              notification.close();
            };
          } catch (error) {
            console.log('Notifications système non disponibles');
          }
        }
        
        // Afficher une alerte visuelle dans l'interface
        setNewMessageAlert({
          show: true,
          message: data.content,
          sender: data.sender?.name || 'Nouveau message'
        });
        
        // Masquer l'alerte après 5 secondes
        setTimeout(() => {
          setNewMessageAlert({show: false, message: '', sender: ''});
        }, 5000);
      }
    };

    socket.on('message:received', handleNewMessage);
    
    return () => {
      socket.off('message:received', handleNewMessage);
    };
  }, [socket, currentUser.id, remoteUser.id, setMessages]);

  // Formatage du temps
  const formatMessageTime = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  // Formatage de la dernière activité
  const formatLastSeen = useCallback((userId: string) => {
    const status = userStatuses.get(userId);
    if (!status) return 'Statut inconnu';
    
    if (status.isOnline) return 'En ligne';
    
    const now = new Date();
    const lastSeen = new Date(status.lastSeen);
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'À l\'instant';
    if (diffMinutes < 60) return `Il y a ${diffMinutes}min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    
    return lastSeen.toLocaleDateString();
  }, [userStatuses]);

  // Icône de statut de message
  const getMessageStatusIcon = useCallback((message: any) => {
    if (!message.fromCurrentUser) return null;

    const className = "w-3 h-3 ml-1";
    
    switch (message.status) {
      case 'sending':
        return <Clock className={`${className} text-gray-400 animate-pulse`} />;
      case 'sent':
        return <Check className={`${className} text-gray-400`} />;
      case 'delivered':
        return <CheckCheck className={`${className} text-gray-400`} />;
      case 'read':
        return <CheckCheck className={`${className} text-blue-500`} />;
      case 'failed':
        return <AlertCircle className={`${className} text-red-500`} />;
      default:
        return null;
    }
  }, []);

  // ✅ CORRECTION: Gestion de la frappe avec vérification de conversationId
  const handleTyping = useCallback(() => {
    // Vérifier que conversationId existe
    if (!conversationId) {
      console.warn('conversationId non défini, ignore la frappe');
      return;
    }

    if (!isTyping && socket) {
      setIsTyping(true);
      sendTypingIndicator(remoteUser.id, conversationId);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      setIsTyping(false);
      if (socket && conversationId) {
        sendStoppedTyping(remoteUser.id, conversationId);
      }
    }, 2000);
  }, [isTyping, socket, remoteUser.id, conversationId, sendTypingIndicator, sendStoppedTyping]);

  // Envoi de message
  const handleSendMessage = useCallback(async () => {
    const content = messageInput.trim();
    if (!content) return;

    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    // Message temporaire pour l'UI
    const tempMessage = {
      id: clientId,
      content,
      senderId: currentUser.id,
      receiverId: remoteUser.id,
      timestamp,
      fromCurrentUser: true,
      status: 'sending' as const,
      clientId,
      sender: currentUser
    };

    setMessages(prev => [...prev, tempMessage]);
    setMessageInput('');

    try {
      await sendMessage({
        content,
        receiverId: remoteUser.id,
        to: remoteUser.id, // Pour compatibilité avec le serveur
        clientId,
        timestamp
      });

      // Mettre à jour le statut du message après envoi réussi
      setMessages(prev => prev.map(msg => 
        msg.clientId === clientId
          ? { ...msg, status: 'sent' as const }
          : msg
      ));
    } catch (error) {
      console.log('📦 Message mis en queue offline:', error);
      
      // Mettre à jour le statut du message
      setMessages(prev => prev.map(msg => 
        msg.clientId === clientId
          ? { ...msg, status: isOnline ? 'failed' as const : 'sending' as const, isOffline: true }
          : msg
      ));
    }
  }, [messageInput, currentUser, remoteUser.id, sendMessage, setMessages, isOnline]);

  // Gestion des touches
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    } else {
      handleTyping();
    }
  }, [handleSendMessage, handleTyping]);

  // Recharger les messages manuellement
  const reloadMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/chat?otherUserId=${remoteUser.id}&limit=50`);
      const data = await response.json();
      
      if (data.success && data.messages) {
        const formattedMessages = data.messages.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          senderId: msg.senderId,
          receiverId: msg.receiverId,
          timestamp: msg.createdAt || msg.timestamp,
          fromCurrentUser: msg.senderId === currentUser.id,
          status: msg.status || (msg.readAt ? 'read' : 'delivered'),
          clientId: msg.clientId,
          sender: msg.sender
        }));
        
        setMessages(formattedMessages);
        console.log('✅ Messages rechargés:', formattedMessages.length);
      }
    } catch (error) {
      console.error('❌ Erreur rechargement messages:', error);
    }
  }, [remoteUser.id, currentUser.id, setMessages]);

  // WebRTC - Obtenir le flux local
  const getLocalStream = useCallback(async (video: boolean = true) => {
    try {
      const constraints = {
        video: video ? { width: 1280, height: 720 } : false,
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      console.log('✅ Flux local obtenu:', stream.getTracks().map(t => `${t.kind}: ${t.label}`));

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      localStreamRef.current = stream;

      return stream;
    } catch (error) {
      console.error('❌ Erreur accès média:', error);
      throw error;
    }
  }, []);

  // WebRTC - Démarrer un appel
  const startCall = useCallback(async (isVideo: boolean = false) => {
    if (!socket || !isConnected) {
      alert('Connexion Socket non disponible');
      return;
    }

    try {
      console.log(`📞 Démarrage appel ${isVideo ? 'vidéo' : 'audio'}`);
      
      const stream = await getLocalStream(isVideo);
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      // Ajouter les tracks
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Gestion des événements
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          console.log('🧊 Envoi ICE candidate');
          socket.emit('call:ice-candidate', {
            candidate: event.candidate,
            to: remoteUser.id
          });
        }
      };

      pc.ontrack = (event) => {
        console.log('📺 Flux distant reçu');
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log('🔗 État connexion WebRTC:', state);
        
        if (state === 'failed' || state === 'closed') {
          console.log('❌ Connexion WebRTC fermée');
          endCall();
        }
      };

      // Créer l'offre
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      setPeerConnection(pc);
      setCallType(isVideo ? 'video' : 'audio');
      setIsVideoEnabled(isVideo);
      setShowCallInterface(true);
      setIsInCall(true);

      // Envoyer l'offre
      socket.emit('call:offer', {
        offer,
        to: remoteUser.id,
        callerId: currentUser.id,
        callerName: currentUser.name,
        isVideoCall: isVideo,
        callId: `call_${Date.now()}`
      });

    } catch (error) {
      console.error('❌ Erreur démarrage appel:', error);
      alert('Impossible de démarrer l\'appel');
    }
  }, [socket, isConnected, remoteUser.id, currentUser, getLocalStream]);

  // WebRTC - Accepter un appel
  const acceptCall = useCallback(async () => {
    if (!incomingCall || !socket) return;

    try {
      console.log('✅ Acceptation appel');
      
      const stream = await getLocalStream(incomingCall.isVideoCall);
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('call:ice-candidate', {
            candidate: event.candidate,
            to: incomingCall.callerId
          });
        }
      };

      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      await pc.setRemoteDescription(incomingCall.offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      setPeerConnection(pc);
      setIsInCall(true);
      setIncomingCall(null);

      socket.emit('call:answer', {
        answer,
        to: incomingCall.callerId,
        callId: incomingCall.callId
      });

    } catch (error) {
      console.error('❌ Erreur acceptation appel:', error);
    }
  }, [incomingCall, socket, getLocalStream]);

  // WebRTC - Refuser/terminer un appel
  const endCall = useCallback(() => {
    console.log('🔚 Fin appel');

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setRemoteStream(null);
    setIsInCall(false);
    setShowCallInterface(false);
    setIncomingCall(null);

    if (socket) {
      socket.emit('call:end', {
        to: remoteUser.id
      });
    }
  }, [localStream, peerConnection, socket, remoteUser.id]);

  // Basculer vidéo/audio
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, [localStream]);

  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, [localStream]);

  const offlineStats = getOfflineStats();
  const remoteUserStatus = userStatuses.get(remoteUser.id);
  const isRemoteUserTyping = typingUsers.has(remoteUser.id);

  // Interface d'appel
  if (showCallInterface) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg overflow-hidden w-full max-w-4xl h-3/4">
          {/* Header d'appel */}
          <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
            <div>
              <h3 className="font-semibold">
                {incomingCall && !isInCall 
                  ? `Appel entrant de ${incomingCall.callerName}` 
                  : isInCall 
                    ? `En communication avec ${remoteUser.name}`
                    : `Appel vers ${remoteUser.name}`
                }
              </h3>
              <p className="text-sm text-gray-300">
                {callType === 'video' ? 'Appel vidéo' : 'Appel audio'}
              </p>
            </div>
            <button onClick={endCall} className="p-2 hover:bg-gray-700 rounded">
              <X size={20} />
            </button>
          </div>

          {/* Zone vidéo */}
          <div className="relative flex-1 bg-gray-900" style={{ height: 'calc(100% - 140px)' }}>
            {remoteStream && (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            )}

            {localStream && callType === 'video' && (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg border-2 border-white object-cover"
              />
            )}

            {!isInCall && incomingCall && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="text-center text-white">
                  <PhoneCall size={48} className="mx-auto mb-4 animate-pulse" />
                  <p className="text-lg">Appel entrant...</p>
                </div>
              </div>
            )}
          </div>

          {/* Contrôles d'appel */}
          <div className="bg-gray-800 p-4">
            {incomingCall && !isInCall ? (
              <div className="flex justify-center space-x-4">
                <button
                  onClick={endCall}
                  className="flex items-center space-x-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  <PhoneOff size={20} />
                  <span>Refuser</span>
                </button>
                <button
                  onClick={acceptCall}
                  className="flex items-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  <Phone size={20} />
                  <span>Accepter</span>
                </button>
              </div>
            ) : (
              <div className="flex justify-center space-x-4">
                {callType === 'video' && (
                  <button
                    onClick={toggleVideo}
                    className={`p-3 rounded-full ${
                      isVideoEnabled ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-500 hover:bg-red-600'
                    } text-white`}
                  >
                    {isVideoEnabled ? <Video size={20} /> : <VideoOffIcon size={20} />}
                  </button>
                )}
                
                <button
                  onClick={toggleAudio}
                  className={`p-3 rounded-full ${
                    isAudioEnabled ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-500 hover:bg-red-600'
                  } text-white`}
                >
                  {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                </button>
                
                <button
                  onClick={endCall}
                  className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <PhoneOff size={20} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Interface de chat principale
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b bg-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            {remoteUser.image ? (
              <img
                src={remoteUser.image}
                alt={remoteUser.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                {remoteUser.name?.charAt(0) || '?'}
              </div>
            )}
            
            {/* Indicateur de statut */}
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
              remoteUserStatus?.isOnline ? 'bg-green-500' : 'bg-gray-400'
            }`} />
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900">
              {remoteUser.name || 'Utilisateur'}
            </h3>
            <p className="text-sm text-gray-500">
              {formatLastSeen(remoteUser.id)}
              {isRemoteUserTyping && ' • en train d\'écrire...'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Indicateurs de statut */}
          <div className="flex items-center space-x-2 mr-4">
            {offlineStats.total > 0 && (
              <div 
                className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full cursor-pointer hover:bg-orange-200"
                onClick={syncOfflineMessages}
                title={`${offlineStats.pending} en attente, ${offlineStats.failed} échoués`}
              >
                <Archive size={12} className="inline mr-1" />
                {offlineStats.total}
              </div>
            )}

            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
              isOnline && isConnected
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {isOnline && isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
              <span>{isOnline && isConnected ? 'En ligne' : 'Hors ligne'}</span>
            </div>

            {socketStats && (
              <div className="text-xs text-gray-500">
                {socketStats.connectedUsers} en ligne
              </div>
            )}

            <button
              onClick={reloadMessages}
              className="p-1 text-gray-500 hover:text-gray-700"
              title="Recharger les messages"
            >
              <RefreshCw size={14} />
            </button>

            <button
              onClick={testConnection}
              className="p-1 text-gray-500 hover:text-gray-700"
              title="Tester connexion"
            >
              <UserCheck size={14} />
            </button>

            {/* Bouton pour activer les notifications */}
            {notificationPermission === 'default' && (
              <button
                onClick={requestNotificationPermission}
                className="p-1 text-yellow-600 hover:text-yellow-700 animate-pulse"
                title="Activer les notifications"
              >
                <Bell size={14} />
              </button>
            )}
            {notificationPermission === 'granted' && (
              <button
                onClick={testNotification}
                className="p-1 text-green-600 hover:text-green-700"
                title="Tester les notifications (cliquez pour tester)"
              >
                <Bell size={14} />
              </button>
            )}
            {notificationPermission === 'denied' && (
              <div className="p-1 text-red-600" title="Notifications refusées">
                <BellOff size={14} />
              </div>
            )}
          </div>

          {/* Boutons d'appel */}
          <button 
            onClick={() => startCall(false)}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
            disabled={!isConnected || !remoteUserStatus?.isOnline}
            title="Appel audio"
          >
            <Phone size={18} />
          </button>
          <button 
            onClick={() => startCall(true)}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
            disabled={!isConnected || !remoteUserStatus?.isOnline}
            title="Appel vidéo"
          >
            <Video size={18} />
          </button>
          <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative">
        {/* Alerte de nouveau message */}
        {newMessageAlert.show && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
            <div className="bg-pink-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3">
              <Bell className="animate-pulse" size={20} />
              <div>
                <p className="font-semibold">{newMessageAlert.sender}</p>
                <p className="text-sm">{newMessageAlert.message.substring(0, 50)}...</p>
              </div>
            </div>
          </div>
        )}
        {!isAuthenticated && (
          <div className="text-center py-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <p className="text-yellow-700 text-sm">
                {connectionError || 'Connexion en cours...'}
              </p>
            </div>
          </div>
        )}

        {isLoadingMessages ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto mb-2"></div>
            <p className="text-gray-500 text-sm">Chargement des messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-6xl mb-4">💬</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Commencez votre conversation
            </h3>
            <p className="text-gray-500">
              Envoyez le premier message à {remoteUser.name}
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.fromCurrentUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                  message.fromCurrentUser
                    ? 'bg-pink-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                <div className={`flex items-center justify-end mt-1 space-x-1 text-xs ${
                  message.fromCurrentUser ? 'text-pink-100' : 'text-gray-500'
                }`}>
                  <span>{formatMessageTime(message.timestamp)}</span>
                  {message.isOffline && (
                    <Archive size={10} className="text-orange-400" title="Message offline" />
                  )}
                  {getMessageStatusIcon(message)}
                </div>
              </div>
            </div>
          ))
        )}
        
        {/* Indicateur de frappe */}
        {isRemoteUserTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-2 rounded-2xl">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-white p-4">
        <div className="flex items-end space-x-2">
          <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
            <Paperclip size={20} />
          </button>
          
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Tapez votre message..."
              className="w-full resize-none border border-gray-300 rounded-2xl px-4 py-2 pr-12 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent max-h-32"
              rows={1}
              disabled={!isAuthenticated}
            />
            
            <button 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 ${
                showEmojiPicker ? 'text-pink-600 bg-pink-50' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Smile size={18} />
            </button>

            {/* Sélecteur d'emojis */}
            {showEmojiPicker && (
              <EmojiPicker
                onEmojiSelect={handleEmojiSelect}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || !isAuthenticated}
            className="p-2 bg-pink-600 text-white rounded-full hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </div>
        
        {/* Alertes */}
        {!isOnline && (
          <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded p-2">
            <p className="text-yellow-700 text-sm">
              Mode hors ligne - Vos messages seront envoyés à la reconnexion
            </p>
          </div>
        )}
        
        {offlineStats.failed > 0 && (
          <div className="mt-2 bg-red-50 border border-red-200 rounded p-2 flex items-center justify-between">
            <p className="text-red-700 text-sm">
              {offlineStats.failed} message(s) n'ont pas pu être envoyés
            </p>
            <button
              onClick={syncOfflineMessages}
              className="text-red-700 text-sm underline hover:no-underline"
            >
              Réessayer
            </button>
          </div>
        )}

        {connectionError && (
          <div className="mt-2 bg-red-50 border border-red-200 rounded p-2">
            <p className="text-red-700 text-sm">{connectionError}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatSystem;