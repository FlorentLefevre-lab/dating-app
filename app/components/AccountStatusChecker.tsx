'use client';

import { useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';

/**
 * Composant qui vérifie le statut du compte à chaque navigation.
 * Si suspendu/banni → déconnexion et redirection vers login.
 */
export function AccountStatusChecker() {
  const { status } = useSession();
  const pathname = usePathname();
  const isCheckingRef = useRef<boolean>(false);

  // Chemins où on ne vérifie pas (pages publiques)
  const publicPaths = [
    '/auth/login',
    '/auth/register',
    '/auth/error',
    '/auth/verify-email',
    '/auth/reset-password',
    '/',
  ];

  useEffect(() => {
    // Ne pas vérifier si pas authentifié ou sur une page publique
    if (status !== 'authenticated') return;
    if (publicPaths.some(p => pathname === p || pathname.startsWith('/auth/'))) return;
    if (isCheckingRef.current) return;

    const checkAndRedirect = async () => {
      isCheckingRef.current = true;

      try {
        const response = await fetch('/api/user/status', {
          method: 'GET',
          cache: 'no-store',
        });

        if (!response.ok) {
          isCheckingRef.current = false;
          return;
        }

        const data = await response.json();
        const accountStatus = data.user?.accountStatus || data.accountStatus;

        if (accountStatus === 'SUSPENDED' || accountStatus === 'BANNED') {
          // Déconnecter et rediriger vers login
          await signOut({
            redirect: true,
            callbackUrl: '/auth/login?error=account_suspended'
          });
        }
      } catch (error) {
        // Silencieux en cas d'erreur
      } finally {
        isCheckingRef.current = false;
      }
    };

    checkAndRedirect();
  }, [pathname, status]);

  return null;
}
