// hooks/useAccountActions.ts - Version complètement indépendante de useQuery
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface UseAccountActionsResult {
  suspendAccount: (data?: any) => Promise<any>;
  reactivateAccount: () => Promise<any>;
  checkAccountStatus: () => Promise<any>;
  isLoading: boolean;
  error: string | null;
}

export function useAccountActions(): UseAccountActionsResult {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fonction utilitaire pour les appels API
  const makeApiCall = useCallback(async (method: string, data?: any) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      };

      if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
      }

      const response = await fetch('/api/user/suspend-account', options);

      if (!response.ok) {
        let errorMessage = `Erreur ${response.status}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // Ignore JSON parse errors
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur inconnue';
      setError(errorMessage);
      console.error(`Erreur ${method}:`, err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const suspendAccount = useCallback(async (data: any = {}) => {
    return makeApiCall('POST', data);
  }, [makeApiCall]);

  const reactivateAccount = useCallback(async () => {
    const result = await makeApiCall('PUT');
    router.push('/home'); // Garde la redirection pour réactivation
    return result;
  }, [makeApiCall, router]);

  const checkAccountStatus = useCallback(async () => {
    return makeApiCall('GET');
  }, [makeApiCall]);

  return {
    suspendAccount,
    reactivateAccount,
    checkAccountStatus,
    isLoading,
    error
  };
}