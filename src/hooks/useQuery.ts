// hooks/useQuery.ts - Version optimisée et corrigée
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';

export interface QueryOptions {
  cache?: boolean;
  cacheTtl?: number;
  polling?: number;
  enabled?: boolean;
  retryOnError?: boolean;
  requireAuth?: boolean;
}

export interface QueryReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  post: (body?: any) => Promise<T>;
  put: (body?: any) => Promise<T>;
  delete: () => Promise<T>;
}

// Cache global simple avec gestion TTL améliorée
class SimpleCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttl: number): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item || Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

const globalCache = new SimpleCache();

export function useQuery<T = any>(
  endpoint: string,
  options: QueryOptions = {}
): QueryReturn<T> {
  const {
    cache = false,
    cacheTtl = 300000,
    polling = 0,
    enabled = true,
    retryOnError = false,
    requireAuth = true
  } = options;

  const { data: session, status } = useSession();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Refs pour cleanup et contrôle
  const abortController = useRef<AbortController | null>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const retryTimeout = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // États dérivés stabilisés
  const isAuthReady = !requireAuth || (status === 'authenticated' && session?.user?.id);
  const shouldFetch = enabled && (!requireAuth || isAuthReady);

  // Fonction fetch avec gestion d'erreur améliorée
  const fetchData = useCallback(async (method: string = 'GET', body?: any): Promise<T> => {
    // Vérification préalable
    if (!mountedRef.current || !shouldFetch) {
      throw new Error('Component unmounted or conditions not met');
    }

    // Vérifier cache d'abord (seulement pour GET)
    if (method === 'GET' && cache) {
      const cached = globalCache.get(endpoint);
      if (cached && mountedRef.current) {
        setData(cached);
        setIsLoading(false);
        return cached;
      }
    }

    // Annuler requête précédente
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    try {
      if (mountedRef.current) {
        setIsLoading(true);
        setError(null);
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
        signal: abortController.current.signal
      });

      if (!response.ok) {
        let errorMessage = `Erreur ${response.status}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // Ignore JSON parse errors
        }

        if (response.status === 401) {
          errorMessage = 'Session expirée';
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      if (!mountedRef.current) {
        return result; // Component démonté, ne pas mettre à jour l'état
      }
      
      // Mettre en cache (seulement pour GET)
      if (method === 'GET' && cache) {
        globalCache.set(endpoint, result, cacheTtl);
      }
      
      setData(result);
      setIsLoading(false);
      
      return result;

    } catch (err: any) {
      if (!mountedRef.current) {
        return data as T; // Component démonté
      }

      if (err.name === 'AbortError') {
        return data as T; // Requête annulée
      }
      
      const errorMessage = err.message || 'Erreur inconnue';
      setError(errorMessage);
      setIsLoading(false);
      
      // Retry automatique avec backoff
      if (retryOnError && method === 'GET' && mountedRef.current) {
        retryTimeout.current = setTimeout(() => {
          if (mountedRef.current) {
            fetchData(method, body).catch(() => {}); // Ignore retry errors
          }
        }, 2000);
      }
      
      throw err;
    }
  }, [endpoint, shouldFetch, cache, cacheTtl, retryOnError]); // Dépendances stables

  // Actions avec gestion d'erreur
  const refresh = useCallback(async (): Promise<void> => {
    if (cache) globalCache.invalidate(endpoint);
    try {
      await fetchData('GET');
    } catch (err) {
      // Error already handled in fetchData
    }
  }, [fetchData, cache, endpoint]);

  const post = useCallback(async (body?: any): Promise<T> => {
    return fetchData('POST', body);
  }, [fetchData]);

  const put = useCallback(async (body?: any): Promise<T> => {
    return fetchData('PUT', body);
  }, [fetchData]);

  const deleteMethod = useCallback(async (): Promise<T> => {
    return fetchData('DELETE');
  }, [fetchData]);

  // Effet pour le fetch initial
  useEffect(() => {
    mountedRef.current = true;
    
    if (!shouldFetch) {
      setIsLoading(false);
      return;
    }

    fetchData('GET').catch(() => {
      // Erreurs gérées dans fetchData
    });
  }, [shouldFetch]); // Retirer fetchData de la dépendance pour éviter les boucles

  // Effet pour le polling
  useEffect(() => {
    if (!polling || !shouldFetch) {
      return;
    }

    pollingInterval.current = setInterval(() => {
      if (mountedRef.current) {
        fetchData('GET').catch(() => {
          // Erreurs gérées dans fetchData
        });
      }
    }, polling);

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    };
  }, [polling, shouldFetch]); // Retirer fetchData de la dépendance

  // Cleanup général
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      
      if (abortController.current) {
        abortController.current.abort();
      }
      
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
      
      if (retryTimeout.current) {
        clearTimeout(retryTimeout.current);
      }
    };
  }, []);

  return {
    data,
    isLoading,
    error,
    refresh,
    post,
    put,
    delete: deleteMethod
  };
}

// Hook utilitaire pour nettoyer le cache
export function useCacheClear() {
  return useCallback(() => {
    globalCache.clear();
  }, []);
}

// Hook pour invalider une clé spécifique du cache
export function useCacheInvalidate() {
  return useCallback((key: string) => {
    globalCache.invalidate(key);
  }, []);
}