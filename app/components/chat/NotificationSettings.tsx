// src/components/chat/NotificationSettings.tsx
// Composant pour gérer les paramètres de notification du chat

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, Volume2, VolumeX, X, Settings } from 'lucide-react';

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  notificationPermission: NotificationPermission | 'unsupported';
  onRequestPermission: () => Promise<void>;
  soundEnabled: boolean;
  onSoundEnabledChange: (enabled: boolean) => void;
  browserNotificationsEnabled: boolean;
  onBrowserNotificationsEnabledChange: (enabled: boolean) => void;
  onTestSound?: () => void;
}

export function NotificationSettings({
  isOpen,
  onClose,
  notificationPermission,
  onRequestPermission,
  soundEnabled,
  onSoundEnabledChange,
  browserNotificationsEnabled,
  onBrowserNotificationsEnabledChange,
  onTestSound
}: NotificationSettingsProps) {
  const canEnableBrowserNotifications = notificationPermission === 'granted';
  const needsPermission = notificationPermission === 'default';
  const permissionDenied = notificationPermission === 'denied';
  const notSupported = notificationPermission === 'unsupported';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-50"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed right-4 top-20 w-80 bg-white rounded-xl shadow-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Notifications</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Son de notification */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {soundEnabled ? (
                    <Volume2 className="w-5 h-5 text-pink-500" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-gray-400" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">Son</p>
                    <p className="text-sm text-gray-500">
                      Jouer un son pour les nouveaux messages
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onSoundEnabledChange(!soundEnabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    soundEnabled ? 'bg-pink-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      soundEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Notifications navigateur */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {browserNotificationsEnabled && canEnableBrowserNotifications ? (
                    <Bell className="w-5 h-5 text-pink-500" />
                  ) : (
                    <BellOff className="w-5 h-5 text-gray-400" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">Notifications</p>
                    <p className="text-sm text-gray-500">
                      Afficher des notifications système
                    </p>
                  </div>
                </div>
                {canEnableBrowserNotifications ? (
                  <button
                    onClick={() => onBrowserNotificationsEnabledChange(!browserNotificationsEnabled)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      browserNotificationsEnabled ? 'bg-pink-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        browserNotificationsEnabled ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                ) : needsPermission ? (
                  <button
                    onClick={onRequestPermission}
                    className="px-3 py-1.5 text-sm font-medium text-pink-600 bg-pink-50 rounded-lg hover:bg-pink-100 transition-colors"
                  >
                    Activer
                  </button>
                ) : (
                  <span className="text-sm text-gray-400">
                    {permissionDenied ? 'Bloqué' : 'Non supporté'}
                  </span>
                )}
              </div>

              {/* Message d'aide */}
              {permissionDenied && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    Les notifications sont bloquées. Pour les activer, cliquez sur l'icône de cadenas dans la barre d'adresse de votre navigateur.
                  </p>
                </div>
              )}

              {notSupported && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Votre navigateur ne supporte pas les notifications système.
                  </p>
                </div>
              )}

              {/* Bouton test son */}
              {soundEnabled && onTestSound && (
                <button
                  onClick={onTestSound}
                  className="w-full py-2 px-4 text-sm font-medium text-pink-600 bg-pink-50 rounded-lg hover:bg-pink-100 transition-colors"
                >
                  🔔 Tester le son de notification
                </button>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-500 text-center">
                Les notifications ne s'affichent que lorsque vous n'êtes pas sur cette page.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default NotificationSettings;
