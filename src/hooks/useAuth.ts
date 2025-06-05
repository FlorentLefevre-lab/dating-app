// src/hooks/useAuth.ts - Hook d'authentification amélioré
'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useCallback } from 'react';

interface UseAuthOptions {
  redirectTo?: string;
  redirectIfFound?: boolean;
}

interface AuthUser {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  age?: number;
  bio?: string;
  location?: string;
}

interface UseAuthReturn {
  session: any;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  isLoading: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  logout: () => Promise<void>;
}

/**
 * Hook pour les pages qui nécessitent une authentification
 * Redirige vers la page de login si non authentifié
 */
export function useAuth(options: UseAuthOptions = {}): UseAuthReturn {
  const { redirectTo = '/auth/login', redirectIfFound = false } = options;
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'loading') return; // Encore en chargement

    // Rediriger si non authentifié (comportement par défaut)
    if (!redirectIfFound && !session) {
      // Sauvegarder la page actuelle pour redirection après login
      const callbackUrl = encodeURIComponent(pathname);
      router.push(`${redirectTo}?callbackUrl=${callbackUrl}`);
    }

    // Rediriger si authentifié (pour les pages guest-only)
    if (redirectIfFound && session) {
      router.push(redirectTo);
    }
  }, [session, status, router, redirectTo, redirectIfFound, pathname]);

  const logout = useCallback(async () => {
    try {
      await signOut({ 
        callbackUrl: '/auth/login',
        redirect: true 
      });
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  }, []);

  return {
    session,
    status,
    isLoading: status === 'loading',
    isAuthenticated: !!session,
    user: session?.user as AuthUser | null,
    logout,
  };
}

/**
 * Hook pour les pages qui nécessitent d'être déconnecté
 * Redirige vers le profil si déjà authentifié
 */
export function useGuestOnly(redirectTo = '/profile') {
  return useAuth({ 
    redirectTo, 
    redirectIfFound: true 
  });
}

/**
 * Hook pour vérifier l'authentification sans redirection
 * Utile pour les composants qui ont un comportement conditionnel
 */
export function useAuthStatus() {
  const { data: session, status } = useSession();

  return {
    session,
    status,
    isLoading: status === 'loading',
    isAuthenticated: !!session,
    user: session?.user as AuthUser | null,
  };
}

/**
 * Hook pour protéger une page avec des rôles spécifiques
 * (si vous ajoutez des rôles plus tard)
 */
export function useRequireAuth(requiredRole?: string) {
  const auth = useAuth();

  const hasRequiredRole = useCallback(() => {
    if (!requiredRole) return true;
    // Ajoutez votre logique de vérification de rôle ici
    // return auth.user?.role === requiredRole;
    return true;
  }, [requiredRole]);

  return {
    ...auth,
    hasAccess: auth.isAuthenticated && hasRequiredRole(),
  };
}