// app/components/auth/OnboardingGuard.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, ReactNode } from 'react';

interface OnboardingGuardProps {
  children: ReactNode;
}

export default function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [shouldShowContent, setShouldShowContent] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated') {
      setIsChecking(false);
      setShouldShowContent(true);
      return;
    }

    if (pathname === '/auth/onboarding') {
      setIsChecking(false);
      setShouldShowContent(true);
      return;
    }

    const onboardingCompleted = (session?.user as any)?.onboardingCompleted;
    if (onboardingCompleted === false) {
      router.replace('/auth/onboarding');
      return;
    }

    setShouldShowContent(true);
    setIsChecking(false);
  }, [status, session, router, pathname]);

  // Pendant le loading de la session ou la vérification
  if (status === 'loading' || (status === 'authenticated' && isChecking && !shouldShowContent)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">💖</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Afficher le contenu
  if (shouldShowContent) {
    return <>{children}</>;
  }

  // Redirection en cours
  return null;
}
