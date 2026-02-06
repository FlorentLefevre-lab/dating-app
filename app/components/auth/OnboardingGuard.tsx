// app/components/auth/OnboardingGuard.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef, ReactNode } from 'react';

interface OnboardingGuardProps {
  children: ReactNode;
}

export default function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [shouldShowContent, setShouldShowContent] = useState(false);
  // Ref pour empêcher les vérifications multiples
  const hasCheckedRef = useRef(false);
  const isCheckingRef = useRef(false); // Pour éviter les appels concurrents

  useEffect(() => {
    // Si on a déjà vérifié et autorisé, ne plus rien faire
    if (hasCheckedRef.current && shouldShowContent) {
      return;
    }

    // Attendre que le status soit déterminé
    if (status === 'loading') {
      return;
    }

    // Si non authentifié, laisser AuthGuard gérer
    if (status === 'unauthenticated') {
      setIsChecking(false);
      setShouldShowContent(true);
      return;
    }

    // Sur la page onboarding, toujours afficher le contenu
    if (pathname === '/auth/onboarding') {
      setIsChecking(false);
      setShouldShowContent(true);
      return;
    }

    const onboardingCompleted = (session?.user as any)?.onboardingCompleted;

    // Si la session dit que l'onboarding est complété, on fait confiance
    if (onboardingCompleted === true) {
      hasCheckedRef.current = true;
      setShouldShowContent(true);
      setIsChecking(false);
      return;
    }

    // Éviter les vérifications multiples ou concurrentes
    if (hasCheckedRef.current || isCheckingRef.current) {
      return;
    }

    // Si la session dit false ou undefined, vérifier via l'API (source de vérité)
    // Car la session JWT peut être en retard après un update()
    const checkOnboardingStatus = async () => {
      isCheckingRef.current = true;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch('/api/auth/onboarding/status', {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await response.json();

        hasCheckedRef.current = true;
        isCheckingRef.current = false;

        if (data.completed) {
          setShouldShowContent(true);
          setIsChecking(false);
        } else {
          router.replace('/auth/onboarding');
        }
      } catch (error) {
        clearTimeout(timeoutId);
        isCheckingRef.current = false;
        hasCheckedRef.current = true;
        // En cas d'erreur ou timeout, on laisse passer pour éviter de bloquer
        setShouldShowContent(true);
        setIsChecking(false);
      }
    };

    checkOnboardingStatus();
  }, [status, session, router, pathname, shouldShowContent]);

  // Pendant le loading de la session ou la vérification - écran plein écran pour bloquer toute interaction
  if (status === 'loading' || (status === 'authenticated' && !shouldShowContent)) {
    return (
      <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">💖</div>
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Préparation de votre expérience...</p>
          <p className="mt-2 text-gray-400 text-sm">Vérification de votre profil</p>
        </div>
      </div>
    );
  }

  // Afficher le contenu seulement quand tout est vérifié
  if (shouldShowContent) {
    return <>{children}</>;
  }

  // Redirection en cours - écran de transition
  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4">🚀</div>
        <p className="text-gray-600 font-medium">Redirection en cours...</p>
      </div>
    </div>
  );
}
