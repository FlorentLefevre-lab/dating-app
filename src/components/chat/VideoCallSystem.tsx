// components/VideoCallSystem.tsx - Types corrigés
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneCall,
  PhoneIncoming,
  X,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Socket } from 'socket.io-client';

// Types corrigés
interface CallState {
  isActive: boolean;
  isIncoming: boolean;
  isOutgoing: boolean;
  isVideoCall: boolean;
  callId: string | null;
  remoteUserId: string | null;
  remoteUserName: string | null;
}

interface IncomingCallData {
  callId: string;
  callerId: string;
  callerName: string;
  isVideoCall: boolean;
  offer: RTCSessionDescriptionInit;
}

interface SocketCallData {
  callId: string;
  callerId?: string;
  callerName?: string;
  isVideoCall?: boolean;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidate;
  targetUserId?: string;
  reason?: string;
}

interface VideoCallSystemProps {
  socket: Socket | null;
  currentUserId: string;
  remoteUserId: string;
  remoteUserName: string;
  matchId: string;
  onCallStateChange?: (hasActiveCall: boolean) => void;
}

export const VideoCallSystem: React.FC<VideoCallSystemProps> = ({
    socket,
    currentUserId,
    remoteUserId,
    remoteUserName,
    matchId,
    onCallStateChange
  }) => {
    
    // États avec types corrects
    const [callState, setCallState] = useState<CallState>({
      isActive: false,
      isIncoming: false,
      isOutgoing: false,
      isVideoCall: false,
      callId: null,
      remoteUserId: null,
      remoteUserName: null
    });

  const [isVideoEnabled, setIsVideoEnabled] = useState<boolean>(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [incomingCallData, setIncomingCallData] = useState<IncomingCallData | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // Refs avec types corrects
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<number | null>(null); // ✅ Corrigé : number au lieu de NodeJS.Timeout
  const cleanupRef = useRef<boolean>(false);

  // Configuration ICE servers
  const iceServers: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  // Fonction de nettoyage avec type de retour explicite
  const cleanup = useCallback((): void => {
    if (cleanupRef.current) return;
    cleanupRef.current = true;

    console.log('🧹 Nettoyage VideoCallSystem');

    // Nettoyer les flux
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Track arrêté:', track.kind);
      });
      localStreamRef.current = null;
    }

    // Fermer la connexion WebRTC
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Nettoyer les refs vidéo
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    // Arrêter le timer - ✅ Corrigé : clearInterval avec number
    if (callTimerRef.current !== null) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    // Réinitialiser les états
    setCallDuration(0);
    setIncomingCallData(null);
    setIsConnecting(false);
    setCallState({
      isActive: false,
      isIncoming: false,
      isOutgoing: false,
      isVideoCall: false,
      callId: null,
      remoteUserId: null,
      remoteUserName: null
    });

    if (onCallStateChange) {
      onCallStateChange(false);
    }

    cleanupRef.current = false;
  }, [onCallStateChange]);

  // Terminer un appel avec type de retour explicite
  const endCall = useCallback((): void => {
    console.log('🔚 Fin de l\'appel');

    if (callState.callId && socket) {
      socket.emit('call:end', {
        callId: callState.callId
      });
    }

    cleanup();
  }, [callState.callId, socket, cleanup]);

  // Obtenir le flux media local avec types corrects
  const getLocalStream = useCallback(async (video: boolean = true): Promise<MediaStream> => {
    try {
      console.log(`📹 Demande accès ${video ? 'vidéo + audio' : 'audio seulement'}`);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video,
        audio: true
      });

      console.log('✅ Flux local obtenu:', stream.getTracks().map(t => t.kind));

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      localStreamRef.current = stream;
      return stream;
    } catch (error) {
      console.error('❌ Erreur accès média:', error);
      throw new Error('Impossible d\'accéder à votre caméra/microphone. Vérifiez vos permissions.');
    }
  }, []);

  // Initialiser la connexion WebRTC avec type de retour correct
  const initializePeerConnection = useCallback((callId: string): RTCPeerConnection => {
    const peerConnection = new RTCPeerConnection(iceServers);

    peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent): void => {
      if (event.candidate && socket && !cleanupRef.current) {
        console.log('🧊 Envoi ICE candidate');
        socket.emit('call:ice-candidate', {
          callId,
          candidate: event.candidate,
          targetUserId: remoteUserId
        });
      }
    };

    peerConnection.ontrack = (event: RTCTrackEvent): void => {
      console.log('📺 Flux distant reçu');
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    peerConnection.onconnectionstatechange = (): void => {
      console.log('🔗 État connexion WebRTC:', peerConnection.connectionState);
      
      if (peerConnection.connectionState === 'connected') {
        setIsConnecting(false);
      } else if (peerConnection.connectionState === 'disconnected' || 
                 peerConnection.connectionState === 'failed') {
        console.log('❌ Connexion WebRTC fermée');
        cleanup();
      }
    };

    peerConnection.oniceconnectionstatechange = (): void => {
      console.log('🧊 État ICE:', peerConnection.iceConnectionState);
      
      if (peerConnection.iceConnectionState === 'connected' || 
          peerConnection.iceConnectionState === 'completed') {
        setIsConnecting(false);
      }
    };

    peerConnectionRef.current = peerConnection;
    return peerConnection;
  }, [socket, remoteUserId, cleanup]);

  // Initier un appel avec types corrects
  const startCall = useCallback(async (isVideo: boolean = false): Promise<void> => {
    if (!socket || isConnecting || callState.isActive || callState.isOutgoing) {
      console.log('⚠️ Appel déjà en cours ou pas de socket');
      return;
    }

    try {
      console.log(`🚀 Démarrage appel ${isVideo ? 'vidéo' : 'audio'} vers`, remoteUserName);
      setIsConnecting(true);
      
      const stream = await getLocalStream(isVideo);
      const tempCallId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const peerConnection = initializePeerConnection(tempCallId);

      stream.getTracks().forEach(track => {
        console.log('➕ Ajout track:', track.kind);
        peerConnection.addTrack(track, stream);
      });

      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideo
      });
      
      await peerConnection.setLocalDescription(offer);

      setCallState({
        isActive: false,
        isIncoming: false,
        isOutgoing: true,
        isVideoCall: isVideo,
        callId: tempCallId,
        remoteUserId: remoteUserId,
        remoteUserName: remoteUserName
      });

      setIsVideoEnabled(isVideo);
      
      if (onCallStateChange) {
        onCallStateChange(true);
      }

      socket.emit('call:offer', {
        offer,
        targetUserId: remoteUserId,
        isVideoCall: isVideo,
        matchId: matchId
      });

      console.log('📤 Offre d\'appel envoyée');

    } catch (error: unknown) {
      console.error('❌ Erreur lors du démarrage de l\'appel:', error);
      setIsConnecting(false);
      cleanup();
      const errorMessage = error instanceof Error ? error.message : 'Impossible de démarrer l\'appel';
      alert(errorMessage);
    }
  }, [socket, remoteUserName, remoteUserId, matchId, isConnecting, callState, getLocalStream, initializePeerConnection, cleanup, onCallStateChange]);

  // Accepter un appel avec types corrects
  const acceptCall = useCallback(async (): Promise<void> => {
    if (!incomingCallData || !socket || isConnecting) return;

    try {
      console.log('✅ Acceptation de l\'appel', incomingCallData.callId);
      setIsConnecting(true);
      
      const stream = await getLocalStream(incomingCallData.isVideoCall);
      const peerConnection = initializePeerConnection(incomingCallData.callId);

      stream.getTracks().forEach(track => {
        console.log('➕ Ajout track pour réponse:', track.kind);
        peerConnection.addTrack(track, stream);
      });

      await peerConnection.setRemoteDescription(incomingCallData.offer);
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      setCallState(prev => ({
        ...prev,
        isActive: true,
        isIncoming: false,
        isOutgoing: false,
        callId: incomingCallData.callId
      }));

      setIsVideoEnabled(incomingCallData.isVideoCall);

      socket.emit('call:answer', {
        callId: incomingCallData.callId,
        answer
      });

      setIncomingCallData(null);
      
      if (callTimerRef.current === null) {
        callTimerRef.current = window.setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
      }
      
      console.log('📤 Réponse d\'appel envoyée');

    } catch (error: unknown) {
      console.error('❌ Erreur lors de l\'acceptation de l\'appel:', error);
      setIsConnecting(false);
      cleanup();
      const errorMessage = error instanceof Error ? error.message : 'Impossible d\'accepter l\'appel';
      alert(errorMessage);
    }
  }, [incomingCallData, socket, isConnecting, getLocalStream, initializePeerConnection, cleanup]);

  // Refuser un appel avec types corrects
  const rejectCall = useCallback((): void => {
    if (!incomingCallData || !socket) return;

    console.log('❌ Refus de l\'appel', incomingCallData.callId);

    socket.emit('call:reject', {
      callId: incomingCallData.callId
    });

    setIncomingCallData(null);
    cleanup();
  }, [incomingCallData, socket, cleanup]);

  // Basculer vidéo avec types corrects
  const toggleVideo = useCallback((): void => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        console.log('📹 Vidéo:', videoTrack.enabled ? 'activée' : 'désactivée');
      }
    }
  }, []);

  // Basculer audio avec types corrects
  const toggleAudio = useCallback((): void => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        console.log('🎤 Audio:', audioTrack.enabled ? 'activé' : 'désactivé');
      }
    }
  }, []);

  // Formater la durée avec types corrects
  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Handlers Socket.IO avec types corrects
  useEffect((): (() => void) => {
    if (!socket) return () => {};

    const handleIncomingCall = (data: SocketCallData): void => {
      console.log('📞 Appel entrant reçu:', data);
      
      if (callState.isActive || callState.isOutgoing || callState.isIncoming) {
        console.log('⚠️ Appel ignoré - déjà en communication');
        socket.emit('call:reject', { callId: data.callId });
        return;
      }

      // ✅ Validation des données requises
      if (!data.callerId || !data.callerName || !data.offer || data.isVideoCall === undefined) {
        console.error('❌ Données d\'appel entrant incomplètes');
        return;
      }
      
      const incomingData: IncomingCallData = {
        callId: data.callId,
        callerId: data.callerId,
        callerName: data.callerName,
        isVideoCall: data.isVideoCall,
        offer: data.offer
      };
      
      setIncomingCallData(incomingData);
      setCallState({
        isActive: false,
        isIncoming: true,
        isOutgoing: false,
        isVideoCall: data.isVideoCall,
        callId: data.callId,
        remoteUserId: data.callerId,
        remoteUserName: data.callerName
      });
      
      if (onCallStateChange) {
        onCallStateChange(true);
      }
    };

    const handleCallAnswered = async (data: SocketCallData): Promise<void> => {
      console.log('📞 Appel accepté:', data);
      
      if (peerConnectionRef.current && data.callId === callState.callId && data.answer) {
        try {
          await peerConnectionRef.current.setRemoteDescription(data.answer);
          setCallState(prev => ({ 
            ...prev, 
            isActive: true, 
            isOutgoing: false,
            callId: data.callId 
          }));
          
          if (callTimerRef.current === null) {
            callTimerRef.current = window.setInterval(() => {
              setCallDuration(prev => prev + 1);
            }, 1000);
          }
          
          setIsConnecting(false);
        } catch (error) {
          console.error('❌ Erreur lors de la réponse:', error);
          cleanup();
        }
      }
    };

    const handleIceCandidate = async (data: SocketCallData): Promise<void> => {
      if (peerConnectionRef.current && data.callId === callState.callId && data.candidate) {
        try {
          console.log('🧊 ICE candidate reçu');
          await peerConnectionRef.current.addIceCandidate(data.candidate);
        } catch (error) {
          console.error('❌ Erreur ICE candidate:', error);
        }
      }
    };

    const handleCallRejected = (): void => {
      console.log('❌ Appel refusé');
      cleanup();
    };

    const handleCallEnded = (): void => {
      console.log('🔚 Appel terminé par l\'autre utilisateur');
      cleanup();
    };

    const handleCallFailed = (data: SocketCallData): void => {
      console.log('❌ Échec de l\'appel:', data.reason);
      alert(`Appel impossible: ${data.reason || 'Erreur inconnue'}`);
      cleanup();
    };

    socket.on('call:incoming', handleIncomingCall);
    socket.on('call:answered', handleCallAnswered);
    socket.on('call:ice-candidate', handleIceCandidate);
    socket.on('call:rejected', handleCallRejected);
    socket.on('call:ended', handleCallEnded);
    socket.on('call:failed', handleCallFailed);

    return (): void => {
      socket.off('call:incoming', handleIncomingCall);
      socket.off('call:answered', handleCallAnswered);
      socket.off('call:ice-candidate', handleIceCandidate);
      socket.off('call:rejected', handleCallRejected);
      socket.off('call:ended', handleCallEnded);
      socket.off('call:failed', handleCallFailed);
    };
  }, [socket, callState.callId, callState.isActive, callState.isOutgoing, callState.isIncoming, onCallStateChange, cleanup]);

  // Nettoyage au démontage
  useEffect((): (() => void) => {
    return (): void => {
      console.log('🧹 Démontage VideoCallSystem');
      cleanup();
    };
  }, [cleanup]);

  // Fonctions de rendu avec types de retour React
  const renderCallButtons = (): React.ReactElement | null => {
    if (callState.isIncoming || callState.isOutgoing || callState.isActive || isConnecting) return null;

    return (
      <div className="flex items-center space-x-2">
        <button
          onClick={() => startCall(false)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          title="Appel audio"
          disabled={!socket}
        >
          <Phone className="w-5 h-5 text-gray-600" />
        </button>
        <button
          onClick={() => startCall(true)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          title="Appel vidéo"
          disabled={!socket}
        >
          <Video className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    );
  };

  // Interface d'appel avec types corrects
  const renderCallInterface = (): React.ReactElement | null => {
    const shouldShowCallInterface = callState.isIncoming || callState.isOutgoing || callState.isActive || incomingCallData;

    if (!shouldShowCallInterface) return null;

    return (
      <div className={`fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center ${
        isFullscreen ? 'p-0' : 'p-4'
      }`}>
        <div className={`bg-white rounded-lg overflow-hidden ${
          isFullscreen ? 'w-full h-full' : 'w-full max-w-4xl h-3/4'
        }`}>
          <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
            <div>
              <h3 className="font-semibold">
                {callState.isIncoming && 'Appel entrant de '}
                {callState.isOutgoing && 'Appel en cours vers '}
                {callState.isActive && 'En communication avec '}
                {callState.remoteUserName || remoteUserName}
              </h3>
              {callState.isActive && (
                <p className="text-sm text-gray-300">{formatDuration(callDuration)}</p>
              )}
              {(callState.isOutgoing || isConnecting) && (
                <p className="text-sm text-gray-300">
                  {isConnecting ? 'Connexion...' : 'Appel en cours...'}
                </p>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1 hover:bg-gray-700 rounded"
              >
                {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
              <button
                onClick={endCall}
                className="p-1 hover:bg-gray-700 rounded"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="relative flex-1 bg-gray-900" style={{ height: 'calc(100% - 140px)' }}>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {(callState.isVideoCall || incomingCallData?.isVideoCall) && (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg border-2 border-white object-cover"
              />
            )}

            {(callState.isOutgoing || isConnecting) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="text-center text-white">
                  <PhoneCall size={48} className="mx-auto mb-4 animate-pulse" />
                  <p className="text-lg">
                    {isConnecting ? 'Connexion en cours...' : 'Appel en cours...'}
                  </p>
                  <p className="text-sm text-gray-300">vers {remoteUserName}</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-800 p-4">
            {(callState.isIncoming || incomingCallData) ? (
              <div className="flex justify-center space-x-4">
                <button
                  onClick={rejectCall}
                  className="flex items-center space-x-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  disabled={isConnecting}
                >
                  <PhoneOff size={20} />
                  <span>Refuser</span>
                </button>
                <button
                  onClick={acceptCall}
                  className="flex items-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  disabled={isConnecting}
                >
                  <PhoneIncoming size={20} />
                  <span>{isConnecting ? 'Connexion...' : 'Accepter'}</span>
                </button>
              </div>
            ) : (
              <div className="flex justify-center space-x-4">
                {(callState.isVideoCall || incomingCallData?.isVideoCall) && (
                  <button
                    onClick={toggleVideo}
                    className={`p-3 rounded-full transition-colors ${
                      isVideoEnabled ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-500 hover:bg-red-600'
                    } text-white`}
                    disabled={callState.isOutgoing || isConnecting}
                    title={isVideoEnabled ? 'Désactiver la vidéo' : 'Activer la vidéo'}
                  >
                    {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                  </button>
                )}
                
                <button
                  onClick={toggleAudio}
                  className={`p-3 rounded-full transition-colors ${
                    isAudioEnabled ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-500 hover:bg-red-600'
                  } text-white`}
                  disabled={callState.isOutgoing || isConnecting}
                  title={isAudioEnabled ? 'Couper le micro' : 'Activer le micro'}
                >
                  {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                </button>
                
                <button
                  onClick={endCall}
                  className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  title="Raccrocher"
                >
                  <PhoneOff size={20} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderCallButtons()}
      {renderCallInterface()}
    </>
  );
};

export default VideoCallSystem;