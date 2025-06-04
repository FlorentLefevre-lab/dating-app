// src/components/RegisterServiceWorker.tsx
'use client';

import { useEffect } from 'react';

export default function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('✅ Service Worker enregistré:', registration.scope);
            
            // Vérifier les mises à jour périodiquement
            setInterval(() => {
              registration.update();
            }, 60000); // Toutes les minutes
          })
          .catch(error => {
            console.warn('⚠️ Service Worker non enregistré (pas critique):', error.message);
          });
      });
    }
  }, []);

  return null;
}