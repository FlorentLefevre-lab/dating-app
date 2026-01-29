// ===============================
// 📁 hooks/useQuery.ts - Hook générique pour les appels API avec cache
// ===============================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';

export interface QueryOptions {
  cache?: boolean;
  cacheTtl?: number;
  polling?: number;
  retryOnError?: boolean;
  requireAuth?: boolean;
  enabled?: boolean;
}

export interface QueryReturn<T> {
  data: T | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

// Cache simple en mémoire
class SimpleCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttl: number) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const isExpired = Date.now() - item.timestamp > item.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}

const cache = new SimpleCache();

export function useQuery<T>(
  url: string,
  options: QueryOptions = {}
): QueryReturn<T> {
  const {
    cache: useCache = true,
    cacheTtl = 5 * 60 * 1000, // 5 minutes par défaut
    polling = 0,
    retryOnError = true,
    requireAuth = true,
    enabled = true
  } = options;

  const { data: session, status } = useSession();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // 🔧 Mount/Unmount tracking - MUST be FIRST effect for React StrictMode
  useEffect(() => {
    mountedRef.current = true;
    console.log(`🔧 [useQuery] Component mounted for ${url}`);

    return () => {
      console.log(`🔧 [useQuery] Component unmounting for ${url}`);
      mountedRef.current = false;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [url]);

  const fetchData = useCallback(async (isRefresh = false) => {
    console.log(`🔄 [useQuery] fetchData called for ${url}`, { enabled, requireAuth, status, isRefresh, mounted: mountedRef.current });

    // Vérifications préliminaires
    if (!enabled) {
      console.log(`⏸️ [useQuery] Skipped - not enabled`);
      setIsLoading(false);
      return;
    }
    if (!url) {
      console.log(`⏸️ [useQuery] Skipped - no URL`);
      setIsLoading(false);
      return;
    }
    if (requireAuth && status === 'loading') {
      console.log(`⏳ [useQuery] Waiting for auth...`);
      return;
    }
    if (requireAuth && status !== 'authenticated') {
      console.log(`🚫 [useQuery] Not authenticated`);
      setIsLoading(false);
      setError('Non authentifié');
      return;
    }
    // Note: mountedRef check removed from here - only checked after async operations
    console.log(`✓ [useQuery] All checks passed, proceeding to fetch`);

    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      // Vérifier le cache d'abord
      if (useCache && !isRefresh) {
        const cachedData = cache.get(url);
        if (cachedData) {
          console.log(`📦 [useQuery] Cache HIT for ${url}`);
          setData(cachedData);
          setLastUpdated(new Date());
          setIsLoading(false);
          return;
        }
        console.log(`📦 [useQuery] Cache MISS for ${url}`);
      }

      // Effectuer la requête (avec credentials pour l'authentification)
      console.log(`🌐 [useQuery] Fetching ${url}...`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      console.log(`📡 [useQuery] Response status: ${response.status}`);

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const responseData: T = await response.json();

      if (!mountedRef.current) return;

      // Mettre en cache si activé
      if (useCache) {
        cache.set(url, responseData, cacheTtl);
      }

      console.log(`✅ [useQuery] Data received for ${url}:`, responseData);
      setData(responseData);
      setLastUpdated(new Date());
      setError(null);

    } catch (err) {
      console.error(`❌ [useQuery] Error for ${url}:`, err);
      if (!mountedRef.current) return;

      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);

      // Retry si activé
      if (retryOnError && !isRefresh) {
        setTimeout(() => {
          if (mountedRef.current) {
            fetchData(true);
          }
        }, 2000);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [url, enabled, requireAuth, status, useCache, cacheTtl, retryOnError]);

  const refetch = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  // Chargement initial
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Polling
  useEffect(() => {
    if (polling > 0 && enabled && status === 'authenticated') {
      pollingRef.current = setInterval(() => {
        fetchData(true);
      }, polling);

      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
      };
    }
  }, [polling, enabled, status, fetchData]);

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    refetch,
    lastUpdated
  };
}

// Hook utilitaire pour invalider le cache
export function useInvalidateCache() {
  return useCallback((urlPattern?: string) => {
    if (urlPattern) {
      // TODO: Implémenter une invalidation par pattern
      cache.clear();
    } else {
      cache.clear();
    }
  }, []);
}

// Hook pour les mutations avec invalidation de cache
export function useMutation<TData, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    onSuccess?: (data: TData) => void;
    onError?: (error: Error) => void;
    invalidateCache?: boolean;
  } = {}
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const invalidateCache = useInvalidateCache();

  const mutate = useCallback(async (variables: TVariables) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await mutationFn(variables);

      if (options.invalidateCache) {
        invalidateCache();
      }

      if (options.onSuccess) {
        options.onSuccess(result);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);

      if (options.onError && err instanceof Error) {
        options.onError(err);
      }

      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [mutationFn, options, invalidateCache]);

  return {
    mutate,
    isLoading,
    error
  };
}