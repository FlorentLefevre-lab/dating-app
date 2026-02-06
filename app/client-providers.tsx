'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { ReactNode, useRef, useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { PresenceProvider } from '@/providers/PresenceProvider';
import { AccountStatusChecker } from './components/AccountStatusChecker';
import { MaintenanceGuard, GlobalAnnouncement } from './components/MaintenanceGuard';

// Import dynamique du Navbar sans SSR pour éviter les problèmes d'hydration
const Navbar = dynamic(() => import('@/components/layout/Navbar'), {
  ssr: false,
  loading: () => null
});

interface ClientProvidersProps {
  children: ReactNode;
}

// Routes publiques qui n'ont pas besoin de Navbar/Presence
const PUBLIC_ROUTES = [
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/error',
  '/auth/verify-email',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/resend-verification',
  '/auth/email-required',
];

// Routes où on ne vérifie pas l'onboarding (la page onboarding elle-même)
const ONBOARDING_ROUTES = ['/auth/onboarding'];

// Composant Loading séparé
function LoadingOverlay({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-pulse">💖</div>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500 mx-auto"></div>
        {message && <p className="mt-4 text-gray-600 font-medium">{message}</p>}
      </div>
    </div>
  );
}

// Composant interne qui gère la logique d'authentification
// Rendu uniquement côté client après le montage
function ProtectedContent({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [onboardingStatus, setOnboardingStatus] = useState<boolean | null>(null);
  const checkingRef = useRef(false);
  const redirectingRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  // Vérifier l'onboarding
  useEffect(() => {
    if (status === 'unauthenticated') {
      setOnboardingStatus(null);
      checkingRef.current = false;
      redirectingRef.current = false;
      lastUserIdRef.current = null;
      return;
    }

    if (status !== 'authenticated') return;

    const userId = (session?.user as any)?.id;

    // Reset les refs si c'est un nouvel utilisateur ou première vérification
    if (lastUserIdRef.current !== userId) {
      checkingRef.current = false;
      redirectingRef.current = false;
      lastUserIdRef.current = userId;
    }

    const sessionOnboarding = (session?.user as any)?.onboardingCompleted;
    if (sessionOnboarding === true) {
      setOnboardingStatus(true);
      return;
    }

    if (checkingRef.current) return;
    checkingRef.current = true;

    fetch('/api/auth/onboarding/status')
      .then(res => res.json())
      .then(data => {
        setOnboardingStatus(data.completed === true);
        if (data.completed === true) {
          update();
        }
      })
      .catch(() => {
        setOnboardingStatus(true);
      });
  }, [status, session, update]);

  // Redirection si onboarding pas complété
  useEffect(() => {
    if (onboardingStatus === false && !redirectingRef.current) {
      redirectingRef.current = true;
      router.replace('/auth/onboarding');
    }
  }, [onboardingStatus, router]);

  // Loading de la session
  if (status === 'loading') {
    return <LoadingOverlay />;
  }

  // Non authentifié
  if (status !== 'authenticated') {
    return <main>{children}</main>;
  }

  // Onboarding pas encore vérifié ou pas complété
  if (onboardingStatus !== true) {
    return <LoadingOverlay message="Préparation de votre expérience..." />;
  }

  // Authentifié ET onboarding complété
  return (
    <PresenceProvider heartbeatInterval={120000}>
      <Navbar />
      <main>{children}</main>
    </PresenceProvider>
  );
}

function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  const isPublicRoute = PUBLIC_ROUTES.some(route =>
    pathname === route || pathname.startsWith('/auth/')
  );
  const isOnboardingRoute = ONBOARDING_ROUTES.includes(pathname);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Routes publiques : afficher directement sans vérification
  if (isPublicRoute || isOnboardingRoute) {
    return <main>{children}</main>;
  }

  // Routes protégées : afficher le loader jusqu'au montage côté client
  // IMPORTANT: On rend TOUJOURS le même contenu (main avec loader)
  // pour éviter les erreurs d'hydration
  if (!mounted) {
    return (
      <main>
        <LoadingOverlay />
      </main>
    );
  }

  // Après montage côté client, utiliser le composant protégé
  return <ProtectedContent>{children}</ProtectedContent>;
}

export default function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <SessionProvider refetchInterval={5 * 60}>
      <MaintenanceGuard>
        <AccountStatusChecker />
        <GlobalAnnouncement />
        <AuthenticatedLayout>{children}</AuthenticatedLayout>
      </MaintenanceGuard>
    </SessionProvider>
  );
}
