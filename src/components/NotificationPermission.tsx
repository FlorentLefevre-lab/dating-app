// src/components/NotificationPermission.tsx
'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';

export default function NotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      const result = await Notification.requestPermission();
      setPermission(result);
    }
  };

  if (!('Notification' in window)) {
    return null;
  }

  if (permission === 'granted') {
    return (
      <div className="fixed bottom-4 left-4 bg-green-100 text-green-700 px-4 py-2 rounded-lg flex items-center space-x-2">
        <Bell size={16} />
        <span className="text-sm">Notifications activées</span>
      </div>
    );
  }

  if (permission === 'default') {
    return (
      <div className="fixed bottom-4 left-4 bg-white shadow-lg rounded-lg p-4 max-w-sm">
        <div className="flex items-center space-x-3 mb-3">
          <BellOff className="text-yellow-600" size={24} />
          <div>
            <h3 className="font-semibold">Activer les notifications</h3>
            <p className="text-sm text-gray-600">
              Recevez des alertes pour les nouveaux messages
            </p>
          </div>
        </div>
        <button
          onClick={requestPermission}
          className="w-full px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
        >
          Activer
        </button>
      </div>
    );
  }

  return null;
}