'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from 'next-auth/react';
import { 
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  BellIcon,
  LockClosedIcon,
  PauseIcon,
  XMarkIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

import { SettingsPanelProps } from '../../types/profiles';
import { useAccountSuspension } from '@/hooks/useAccountSuspension';

const SettingsPanel: React.FC<SettingsPanelProps> = ({ 
  profile, 
  photos, 
  session, 
  onMessage
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuspending, setIsSuspending] = useState(false);
  
  // États pour les paramètres de notification (basés sur le schéma)
  const [notificationSettings, setNotificationSettings] = useState({
    messageNotifications: true,
    likeNotifications: true,
    matchNotifications: true
  });

  // ✅ Vérifier si le compte est suspendu - VERSION AMÉLIORÉE AVEC DEBUG
  const accountStatus = profile?.accountStatus?.toString().toUpperCase();
  const isAccountSuspended = accountStatus === 'SUSPENDED' || accountStatus === 'BANNED';
  const isAccountActive = accountStatus === 'ACTIVE';
  
  // Debug pour comprendre le problème
  console.log('🔍 Debug statut compte DÉTAILLÉ:', {
    rawAccountStatus: profile?.accountStatus,
    accountStatusString: accountStatus,
    isAccountSuspended,
    isAccountActive,
    isSuspending,
    profileId: profile?.id,
    profileEmail: profile?.email,
    profileObject: profile
  });

  // ✅ Utilisation du hook pour la réactivation seulement
  const { reactivateAccount, isLoading: hookIsLoading } = useAccountSuspension();

  // Charger les paramètres de notification existants
  useEffect(() => {
    const loadNotificationSettings = async () => {
      try {
        const response = await fetch('/api/user/notification-settings');
        if (response.ok) {
          const settings = await response.json();
          setNotificationSettings(prev => ({
            ...prev,
            ...settings
          }));
        }
      } catch (error) {
        console.error('Erreur chargement paramètres notifications:', error);
      }
    };

    if (profile?.id) {
      loadNotificationSettings();
    }
  }, [profile?.id]);

  // Sauvegarder les paramètres de notification
  const updateNotificationSettings = async (newSettings: Partial<typeof notificationSettings>) => {
    try {
      const updatedSettings = { ...notificationSettings, ...newSettings };
      setNotificationSettings(updatedSettings);

      const response = await fetch('/api/user/notification-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });

      if (!response.ok) {
        throw new Error('Erreur sauvegarde paramètres');
      }

      onMessage('Paramètres mis à jour avec succès', 'success');
    } catch (error) {
      console.error('Erreur mise à jour paramètres:', error);
      onMessage('Erreur lors de la mise à jour des paramètres', 'error');
      // Revenir à l'ancien état en cas d'erreur
      setNotificationSettings(prev => ({ ...prev, ...Object.fromEntries(
        Object.entries(newSettings).map(([key, value]) => [key, !value])
      )}));
    }
  };

  const suspendReasons = [
    { value: 'break', label: 'Pause temporaire' },
    { value: 'privacy', label: 'Préoccupations de confidentialité' },
    { value: 'found_match', label: 'J\'ai trouvé quelqu\'un' },
    { value: 'too_busy', label: 'Trop occupé(e) actuellement' },
    { value: 'rethinking', label: 'Je repense à mes objectifs' },
    { value: 'other', label: 'Autre raison' }
  ];

  // 🔧 FONCTION DE NETTOYAGE COMPLÈTE DES COOKIES ET STORAGE
  const clearAllUserData = async () => {
    try {
      console.log('🧹 Nettoyage complet des données utilisateur...');
      
      // 1. Nettoyer le localStorage
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        console.log('✅ Storage nettoyé');
      }
      
      // 2. Supprimer manuellement tous les cookies
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(";");
        
        for (let cookie of cookies) {
          const eqPos = cookie.indexOf("=");
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          
          // Supprimer le cookie sur différents domaines et paths
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname};`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname};`;
        }
        console.log('✅ Cookies nettoyés');
      }
      
      // 3. Déconnexion NextAuth
      await signOut({ 
        redirect: false, // Empêcher la redirection automatique
        callbackUrl: '/' // URL de callback après déconnexion
      });
      console.log('✅ Session NextAuth fermée');
      
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage:', error);
    }
  };

  // 🔧 FONCTION DE SUSPENSION SIMPLIFIÉE AVEC APPEL DIRECT À L'API
  const handleSuspendAccount = async () => {
    if (isSuspending) {
      console.log('⚠️ Suspension déjà en cours, ignoré');
      return;
    }

    const currentReason = suspendReason;
    setIsSuspending(true);
    
    try {
      console.log('🔄 Début suspension avec déconnexion automatique:', { reason: currentReason });
      
      setShowSuspendModal(false);
      setSuspendReason('');
      
      onMessage('Suspension du compte en cours...', 'info');
      
      const response = await fetch('/api/user/suspend-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: currentReason }),
      });

      const result = await response.json();
      console.log('📤 Réponse API suspension:', result);

      if (!response.ok) {
        if (response.status === 400 && result.suggestion === 'reactivate') {
          throw new Error(`${result.message} Utilisez le bouton "Réactiver" à la place.`);
        }
        
        if (response.status === 401) {
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        }
        
        if (response.status === 404) {
          throw new Error('Utilisateur introuvable. Veuillez vous reconnecter.');
        }
        
        throw new Error(result.message || result.error || 'Erreur lors de la suspension');
      }

      console.log('✅ Suspension API réussie, début de la déconnexion...');
      
      onMessage('Compte suspendu avec succès. Déconnexion en cours...', 'success');
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      await clearAllUserData();
      
      console.log('🔄 Redirection vers la racine...');
      window.location.href = '/';
      
    } catch (error) {
      console.error('❌ Erreur suspension:', error);
      
      setIsSuspending(false);
      setShowSuspendModal(true);
      setSuspendReason(currentReason);
      
      onMessage(
        error instanceof Error ? error.message : 'Erreur lors de la suspension du compte', 
        'error'
      );
    }
  };

  // ✅ FONCTION DE RÉACTIVATION (utilise le hook)
  const handleReactivateAccount = async () => {
    try {
      console.log('🔄 Début réactivation avec hook');
      
      setShowReactivateModal(false);
      
      await reactivateAccount();
      
      onMessage('Votre compte a été réactivé avec succès ! Actualisation...', 'success');
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('❌ Erreur réactivation via hook:', error);
      onMessage(error instanceof Error ? error.message : 'Erreur lors de la réactivation du compte', 'error');
    }
  };

  // 🔧 FONCTION DE SUPPRESSION AMÉLIORÉE AVEC DÉCONNEXION SIMILAIRE
  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'SUPPRIMER') {
      onMessage('Veuillez taper "SUPPRIMER" pour confirmer', 'error');
      return;
    }

    try {
      setLoading(true);
      
      let currentUserId = profile?.id;
      let currentUserEmail = profile?.email;
      
      if (!currentUserId && session?.user) {
        currentUserId = session.user.id || (session.user as any).sub || (session.user as any).userId;
        currentUserEmail = session.user.email || undefined;
      }
      
      if (!currentUserId && !currentUserEmail) {
        onMessage('Erreur: Session invalide. Veuillez vous reconnecter.', 'error');
        return;
      }
      
      setShowDeleteModal(false);
      setDeleteConfirmation('');
      
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          forceUserId: currentUserId,
          forceUserEmail: currentUserEmail 
        })
      });

      if (response.ok) {
        onMessage('Compte supprimé avec succès. Déconnexion...', 'success');
        
        setTimeout(async () => {
          await clearAllUserData();
          window.location.href = '/';
        }, 2000);
      } else {
        throw new Error('Erreur lors de la suppression');
      }
    } catch (error) {
      onMessage('Erreur lors de la suppression du compte', 'error');
      setLoading(false);
      setShowDeleteModal(true);
    }
  };

  return (
    <div className="p-6">
      {/* ✅ BANNIÈRE - Alerte si compte suspendu ou banni */}
      {isAccountSuspended && (
        <div className={`border-l-4 p-4 rounded-r-lg mb-6 ${
          profile?.accountStatus === 'BANNED' 
            ? 'bg-red-100 border-red-500' 
            : 'bg-orange-100 border-orange-500'
        }`}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className={`h-5 w-5 ${
                profile?.accountStatus === 'BANNED' ? 'text-red-500' : 'text-orange-500'
              }`} />
            </div>
            <div className="ml-3">
              <p className={`text-sm ${
                profile?.accountStatus === 'BANNED' ? 'text-red-700' : 'text-orange-700'
              }`}>
                <strong>
                  {profile?.accountStatus === 'BANNED' 
                    ? 'Votre compte est banni.' 
                    : 'Votre compte est suspendu.'
                  }
                </strong> 
                {profile?.accountStatus === 'BANNED'
                  ? ' Votre accès à la plateforme a été restreint. Contactez le support pour plus d\'informations.'
                  : ' Votre profil n\'est pas visible et vous ne recevez plus de notifications. Vous pouvez le réactiver ci-dessous dans la zone de danger.'
                }
              </p>
              <p className={`text-xs mt-1 ${
                profile?.accountStatus === 'BANNED' ? 'text-red-600' : 'text-orange-600'
              }`}>
                Statut actuel: {profile?.accountStatus || 'Non défini'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 🔍 DEBUG - Section temporaire pour diagnostiquer */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-blue-100 border border-blue-300 p-4 rounded-lg mb-6">
          <h3 className="font-medium text-blue-800 mb-2">🔍 Debug Info Détaillé</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <div>Profile ID: {profile?.id || 'Non défini'}</div>
            <div>Raw Account Status: "{profile?.accountStatus}" (type: {typeof profile?.accountStatus})</div>
            <div>Normalized Status: "{accountStatus}"</div>
            <div>Is Suspended: {isAccountSuspended ? 'OUI' : 'NON'}</div>
            <div>Is Active: {isAccountActive ? 'OUI' : 'NON'}</div>
            <div>Is Suspending State: {isSuspending ? 'OUI' : 'NON'}</div>
            <div>Session User ID: {session?.user?.id || 'Non défini'}</div>
            <div>Email: {profile?.email || session?.user?.email || 'Non défini'}</div>
            <div className="pt-2 border-t border-blue-300 mt-2">
              <strong>Logique des boutons:</strong>
              <div>• Devrait afficher "Réactiver": {accountStatus === 'SUSPENDED' ? 'OUI' : 'NON'}</div>
              <div>• Devrait afficher "Banni": {accountStatus === 'BANNED' ? 'OUI' : 'NON'}</div>
              <div>• Devrait afficher "Suspendre": {isAccountActive && !isSuspending ? 'OUI' : 'NON'}</div>
            </div>
          </div>
        </div>
      )}

      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Paramètres du compte
      </h2>
      
      <div className="space-y-6">
        {/* Informations du compte */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <UserCircleIcon className="w-6 h-6 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-800">
              Informations du compte
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-500">Email</div>
                <div className="text-gray-800">{profile?.email}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Membre depuis</div>
                <div className="text-gray-800">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'N/A'}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-500">Dernière mise à jour</div>
                <div className="text-gray-800">
                  {profile?.updatedAt ? new Date(profile.updatedAt).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Nombre de photos</div>
                <div className="text-gray-800">{photos.length}/6</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Statut du compte</div>
                <div className={`text-gray-800 flex items-center ${isAccountSuspended ? 'text-orange-600' : 'text-green-600'}`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${isAccountSuspended ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                  {isAccountSuspended ? 'Suspendu' : 'Actif'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Paramètres de confidentialité */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <ShieldCheckIcon className="w-6 h-6 text-green-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-800">
              Confidentialité et sécurité
            </h3>
          </div>
          
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Les paramètres de confidentialité avancés seront bientôt disponibles. 
                Pour l'instant, votre profil est visible par défaut aux autres utilisateurs connectés.
              </p>
            </div>
          </div>
        </div>

        {/* Paramètres de notifications - BASÉS SUR LE SCHÉMA */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <BellIcon className="w-6 h-6 text-yellow-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-800">
              Paramètres de notifications
            </h3>
          </div>
          
          <div className="space-y-4">
            <label className="flex items-start space-x-3">
              <input 
                type="checkbox" 
                checked={notificationSettings.messageNotifications}
                onChange={(e) => updateNotificationSettings({ messageNotifications: e.target.checked })}
                className="mt-1 h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded" 
              />
              <div>
                <div className="font-medium text-gray-800">Notifications de messages</div>
                <div className="text-sm text-gray-600">
                  Recevoir une notification pour chaque nouveau message
                </div>
              </div>
            </label>
            
            <label className="flex items-start space-x-3">
              <input 
                type="checkbox" 
                checked={notificationSettings.likeNotifications}
                onChange={(e) => updateNotificationSettings({ likeNotifications: e.target.checked })}
                className="mt-1 h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded" 
              />
              <div>
                <div className="font-medium text-gray-800">Notifications de likes</div>
                <div className="text-sm text-gray-600">
                  Recevoir une notification quand quelqu'un like votre profil
                </div>
              </div>
            </label>
            
            <label className="flex items-start space-x-3">
              <input 
                type="checkbox" 
                checked={notificationSettings.matchNotifications}
                onChange={(e) => updateNotificationSettings({ matchNotifications: e.target.checked })}
                className="mt-1 h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded" 
              />
              <div>
                <div className="font-medium text-gray-800">Notifications de matchs</div>
                <div className="text-sm text-gray-600">
                  Recevoir une notification pour chaque nouveau match
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* ✅ ZONE DE DANGER RÉORGANISÉE - BOUTONS AU MÊME NIVEAU */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600 mr-3" />
            <h3 className="text-lg font-semibold text-red-800">
              Zone de danger
            </h3>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-red-700 mb-6">
              Ces actions sont importantes. Réfléchissez bien avant de continuer.
            </p>
            
            {/* BOUTONS AU MÊME NIVEAU - LOGIQUE CORRIGÉE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bouton Suspension/Réactivation - LOGIQUE SIMPLIFIÉE ET ROBUSTE */}
              {(() => {
                console.log('🎯 Rendu bouton - État:', { accountStatus, isAccountActive, isSuspending });
                
                if (accountStatus === 'SUSPENDED') {
                  return (
                    <button
                      onClick={() => {
                        console.log('🔄 Clic réactivation');
                        setShowReactivateModal(true);
                      }}
                      disabled={hookIsLoading}
                      className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {hookIsLoading ? (
                        <div className="flex items-center">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Réactivation...
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <PlayIcon className="w-5 h-5 mr-2" />
                          Réactiver mon compte
                        </div>
                      )}
                    </button>
                  );
                } else if (accountStatus === 'BANNED') {
                  return (
                    <div className="flex items-center justify-center px-4 py-3 bg-red-500 text-white rounded-lg cursor-not-allowed">
                      <div className="flex items-center">
                        <LockClosedIcon className="w-5 h-5 mr-2" />
                        Compte banni - Contactez le support
                      </div>
                    </div>
                  );
                } else if (isAccountActive) {
                  return (
                    <button
                      onClick={() => {
                        console.log('🔄 Clic suspension - État:', { isSuspending });
                        if (!isSuspending) {
                          setShowSuspendModal(true);
                        }
                      }}
                      disabled={isSuspending}
                      className="flex items-center justify-center px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                    >
                      {isSuspending ? (
                        <div className="flex items-center">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Suspension...
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <PauseIcon className="w-5 h-5 mr-2" />
                          Suspendre mon compte
                        </div>
                      )}
                    </button>
                  );
                } else {
                  return (
                    <div className="flex items-center justify-center px-4 py-3 bg-gray-400 text-white rounded-lg cursor-not-allowed">
                      <div className="flex items-center">
                        <LockClosedIcon className="w-5 h-5 mr-2" />
                        Statut: {accountStatus || 'Inconnu'}
                      </div>
                    </div>
                  );
                }
              })()}

              {/* Bouton Suppression */}
              <button 
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <XMarkIcon className="w-5 h-5 mr-2" />
                Supprimer mon compte
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ MODALE DE RÉACTIVATION */}
      <AnimatePresence>
        {showReactivateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowReactivateModal(false);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PlayIcon className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Réactiver votre compte ?
                </h3>
                <p className="text-gray-600">
                  Votre profil redeviendra visible et vous recommencerez à recevoir des notifications.
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-green-800 mb-3">
                  ✅ Après réactivation :
                </h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Votre profil sera à nouveau visible</li>
                  <li>• Vous pourrez envoyer et recevoir des messages</li>
                  <li>• Les notifications seront réactivées</li>
                  <li>• Vous pourrez voir de nouveaux profils</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowReactivateModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleReactivateAccount}
                  disabled={hookIsLoading}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center"
                >
                  {hookIsLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Réactivation...
                    </>
                  ) : (
                    <>
                      <PlayIcon className="w-4 h-4 mr-2" />
                      Réactiver
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✅ MODALE DE SUSPENSION */}
      <AnimatePresence>
        {showSuspendModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowSuspendModal(false);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PauseIcon className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Suspendre votre compte ?
                </h3>
                <p className="text-gray-600">
                  Votre compte sera suspendu et vous serez automatiquement déconnecté.
                </p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-red-800 mb-3 flex items-center gap-2">
                  ⚠️ Déconnexion automatique
                </h4>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• Vous serez immédiatement déconnecté</li>
                  <li>• Vos cookies de session seront supprimés</li>
                  <li>• Vous serez redirigé vers la page d'accueil</li>
                  <li>• Pour vous reconnecter, utilisez vos identifiants habituels</li>
                </ul>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-orange-800 mb-3">
                  ⏸️ Pendant la suspension :
                </h4>
                <ul className="text-sm text-orange-700 space-y-1">
                  <li>• Votre profil ne sera plus visible par les autres</li>
                  <li>• Vous ne recevrez plus de notifications</li>
                  <li>• Vos conversations seront préservées</li>
                  <li>• Vous ne pourrez pas envoyer/recevoir de messages</li>
                  <li>• Vous pourrez réactiver votre compte en vous reconnectant</li>
                </ul>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Raison de la suspension (optionnel) :
                </label>
                <select
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  disabled={isSuspending}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Sélectionnez une raison</option>
                  {suspendReasons.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowSuspendModal(false);
                    setSuspendReason('');
                  }}
                  disabled={isSuspending}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSuspendAccount}
                  disabled={isSuspending}
                  className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {isSuspending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Suspension...
                    </>
                  ) : (
                    <>
                      <PauseIcon className="w-4 h-4 mr-2" />
                      Suspendre
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALE DE SUPPRESSION */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={(e) => e.target === e.currentTarget && setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Supprimer définitivement votre compte ?
                </h3>
                <p className="text-gray-600">
                  Cette action est irréversible et supprimera toutes vos données.
                </p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-red-800 mb-3">
                  🗑️ Sera supprimé définitivement :
                </h4>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• Votre profil et toutes vos informations personnelles</li>
                  <li>• Toutes vos photos ({photos.length} photo{photos.length !== 1 ? 's' : ''})</li>
                  <li>• Tous vos messages et conversations</li>
                  <li>• Tous vos likes donnés et reçus</li>
                  <li>• Tous vos matches actuels</li>
                  <li>• Votre historique d'activité</li>
                  <li>• Vos préférences de recherche</li>
                </ul>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pour confirmer, tapez <span className="font-bold text-red-600">SUPPRIMER</span> ci-dessous :
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Tapez SUPPRIMER"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmation('');
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={loading || deleteConfirmation !== 'SUPPRIMER'}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Suppression...' : 'Supprimer définitivement'}
                </button>
              </div>

              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-700 text-center">
                  ⚠️ Cette action ne peut pas être annulée. Toutes vos données seront perdues à jamais.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsPanel;