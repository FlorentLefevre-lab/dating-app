// lib/cache.ts - Système de cache hybride Redis + Mémoire + API Cache
import redis, { isRedisHealthy } from './redis'

interface CacheOptions {
  ttl?: number
  prefix?: string
}

// Cache en mémoire comme fallback
class MemoryCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  private maxSize = 100

  set(key: string, data: any, ttlSeconds: number = 300): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    })
  }

  get(key: string): any | null {
    const item = this.cache.get(key)
    if (!item) return null

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  invalidatePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }
}

const memoryCache = new MemoryCache()

class CacheManager {
  private defaultTTL = 300
  private defaultPrefix = 'app:'

  private generateKey(key: string, prefix?: string): string {
    const finalPrefix = prefix || this.defaultPrefix
    return `${finalPrefix}${key}`
  }

  private serialize(data: any): string {
    try {
      return JSON.stringify(data)
    } catch (error) {
      console.error('❌ Erreur sérialisation cache:', error)
      throw new Error('Impossible de sérialiser les données')
    }
  }

  private deserialize(data: string): any {
    try {
      return JSON.parse(data)
    } catch (error) {
      console.error('❌ Erreur désérialisation cache:', error)
      return null
    }
  }

  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    const { ttl = this.defaultTTL, prefix } = options
    const cacheKey = this.generateKey(key, prefix)
    const serializedValue = this.serialize(value)

    try {
      if (isRedisHealthy()) {
        await redis.setex(cacheKey, ttl, serializedValue)
        console.log(`📦 Cache Redis SET: ${cacheKey} (TTL: ${ttl}s)`)
        return true
      }
    } catch (error) {
      console.error('❌ Erreur Redis SET, fallback mémoire:', error)
    }

    memoryCache.set(cacheKey, value, ttl)
    console.log(`🧠 Cache mémoire SET: ${cacheKey} (TTL: ${ttl}s)`)
    return true
  }

  async get<T = any>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const { prefix } = options
    const cacheKey = this.generateKey(key, prefix)

    try {
      if (isRedisHealthy()) {
        const value = await redis.get(cacheKey)
        if (value) {
          const deserializedValue = this.deserialize(value)
          console.log(`📦 Cache Redis HIT: ${cacheKey}`)
          return deserializedValue
        }
      }
    } catch (error) {
      console.error('❌ Erreur Redis GET, fallback mémoire:', error)
    }

    const memoryValue = memoryCache.get(cacheKey)
    if (memoryValue) {
      console.log(`🧠 Cache mémoire HIT: ${cacheKey}`)
      return memoryValue
    }

    console.log(`❌ Cache MISS: ${cacheKey}`)
    return null
  }

  async delete(key: string, options: CacheOptions = {}): Promise<boolean> {
    const { prefix } = options
    const cacheKey = this.generateKey(key, prefix)

    try {
      if (isRedisHealthy()) {
        await redis.del(cacheKey)
        console.log(`🗑️ Cache Redis DELETE: ${cacheKey}`)
      }
    } catch (error) {
      console.error('❌ Erreur Redis DELETE:', error)
    }

    memoryCache.delete(cacheKey)
    return true
  }

  async invalidatePattern(pattern: string, options: CacheOptions = {}): Promise<number> {
    const { prefix } = options
    const searchPattern = this.generateKey(pattern, prefix) + '*'
    let deletedCount = 0

    try {
      if (isRedisHealthy()) {
        const keys = await redis.keys(searchPattern)
        if (keys.length > 0) {
          deletedCount = await redis.del(...keys)
          console.log(`🧹 Cache Redis PATTERN DELETE: ${searchPattern} (${deletedCount} clés)`)
        }
      }
    } catch (error) {
      console.error('❌ Erreur Redis PATTERN DELETE:', error)
    }

    memoryCache.invalidatePattern(pattern)
    return deletedCount
  }

  async getOrSet<T = any>(
    key: string, 
    fetcher: () => Promise<T>, 
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key, options)
    if (cached !== null) {
      return cached
    }

    console.log(`🔄 Cache MISS - Exécution fetcher pour: ${key}`)
    const value = await fetcher()
    await this.set(key, value, options)
    return value
  }

  // ========================================
  // 🚀 NOUVELLES MÉTHODES API CACHE
  // ========================================

  /**
   * Cache pour les données de profil utilisateur
   */
  async cacheUserProfile(userId: string, profileData: any): Promise<void> {
    const key = `profile:${userId}`
    await this.set(key, profileData, { 
      prefix: 'api:', 
      ttl: 600 // 10 minutes
    })
    console.log('📦 [API] Profil utilisateur mis en cache:', userId)
  }

  async getUserProfile(userId: string): Promise<any | null> {
    const key = `profile:${userId}`
    const cached = await this.get(key, { prefix: 'api:' })
    if (cached) {
      console.log('📦 [API] Cache HIT - Profil:', userId)
    }
    return cached
  }

  /**
   * Cache pour les résultats de découverte
   */
  async cacheDiscoverResults(userId: string, filters: any, results: any): Promise<void> {
    const filtersKey = JSON.stringify(filters)
    const key = `discover:${userId}:${Buffer.from(filtersKey).toString('base64').slice(0, 20)}`
    
    await this.set(key, results, {
      prefix: 'api:',
      ttl: 300 // 5 minutes pour la découverte
    })
    console.log('📦 [API] Résultats découverte mis en cache pour:', userId)
  }

  async getDiscoverResults(userId: string, filters: any): Promise<any | null> {
    const filtersKey = JSON.stringify(filters)
    const key = `discover:${userId}:${Buffer.from(filtersKey).toString('base64').slice(0, 20)}`
    
    const cached = await this.get(key, { prefix: 'api:' })
    if (cached) {
      console.log('📦 [API] Cache HIT - Découverte:', userId)
    }
    return cached
  }

  /**
   * Cache pour les statistiques utilisateur
   */
  async cacheUserStats(userId: string, stats: any): Promise<void> {
    const key = `stats:${userId}`
    await this.set(key, stats, {
      prefix: 'api:',
      ttl: 1800 // 30 minutes pour les stats
    })
    console.log('📦 [API] Stats utilisateur mises en cache:', userId)
  }

  async getUserStats(userId: string): Promise<any | null> {
    const key = `stats:${userId}`
    const cached = await this.get(key, { prefix: 'api:' })
    if (cached) {
      console.log('📦 [API] Cache HIT - Stats:', userId)
    }
    return cached
  }

  /**
   * Cache pour les données utilisateur de base (utilisé par discover)
   */
  async cacheUserBasicData(userId: string, userData: any): Promise<void> {
    const key = `user_basic:${userId}`
    await this.set(key, userData, {
      prefix: 'api:',
      ttl: 900 // 15 minutes
    })
  }

  async getUserBasicData(userId: string): Promise<any | null> {
    const key = `user_basic:${userId}`
    return await this.get(key, { prefix: 'api:' })
  }

  /**
   * Cache pour les exclusions utilisateur (likes, dislikes, matches)
   */
  async cacheUserExclusions(userId: string, exclusions: any): Promise<void> {
    const key = `exclusions:${userId}`
    await this.set(key, exclusions, {
      prefix: 'api:',
      ttl: 300 // 5 minutes (car ça peut changer rapidement)
    })
  }

  async getUserExclusions(userId: string): Promise<any | null> {
    const key = `exclusions:${userId}`
    return await this.get(key, { prefix: 'api:' })
  }

  /**
   * Invalider le cache utilisateur complet
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await Promise.all([
      this.invalidatePattern(`profile:${userId}`, { prefix: 'api:' }),
      this.invalidatePattern(`stats:${userId}`, { prefix: 'api:' }),
      this.invalidatePattern(`user_basic:${userId}`, { prefix: 'api:' }),
      this.invalidatePattern(`discover:${userId}`, { prefix: 'api:' }),
      this.invalidatePattern(`exclusions:${userId}`, { prefix: 'api:' })
    ])
    console.log('🧹 [API] Cache utilisateur invalidé:', userId)
  }
}

// Instance principale du cache
export const cache = new CacheManager()

// Caches spécialisés existants
export const userCache = {
  get: (userId: string) => cache.get(`user:${userId}`, { prefix: 'users:', ttl: 900 }),
  set: (userId: string, userData: any) => cache.set(`user:${userId}`, userData, { prefix: 'users:', ttl: 900 }),
  delete: (userId: string) => cache.delete(`user:${userId}`, { prefix: 'users:' }),
}

export const sessionCache = {
  get: (sessionId: string) => cache.get(sessionId, { prefix: 'sessions:', ttl: 1800 }),
  set: (sessionId: string, sessionData: any) => cache.set(sessionId, sessionData, { prefix: 'sessions:', ttl: 1800 }),
  delete: (sessionId: string) => cache.delete(sessionId, { prefix: 'sessions:' }),
}

export const emailCache = {
  get: (email: string) => cache.get(email, { prefix: 'email_tokens:', ttl: 3600 }),
  set: (email: string, token: string) => cache.set(email, token, { prefix: 'email_tokens:', ttl: 3600 }),
  delete: (email: string) => cache.delete(email, { prefix: 'email_tokens:' }),
}

// 🚀 NOUVEAUX CACHES API (utilisant les nouvelles méthodes)
export const apiCache = {
  // Cache profil
  profile: {
    get: (userId: string) => cache.getUserProfile(userId),
    set: (userId: string, data: any) => cache.cacheUserProfile(userId, data),
  },
  
  // Cache découverte
  discover: {
    get: (userId: string, filters: any) => cache.getDiscoverResults(userId, filters),
    set: (userId: string, filters: any, data: any) => cache.cacheDiscoverResults(userId, filters, data),
  },
  
  // Cache statistiques
  stats: {
    get: (userId: string) => cache.getUserStats(userId),
    set: (userId: string, data: any) => cache.cacheUserStats(userId, data),
  },
  
  // Cache données de base utilisateur
  userBasic: {
    get: (userId: string) => cache.getUserBasicData(userId),
    set: (userId: string, data: any) => cache.cacheUserBasicData(userId, data),
  },
  
  // Cache exclusions
  exclusions: {
    get: (userId: string) => cache.getUserExclusions(userId),
    set: (userId: string, data: any) => cache.cacheUserExclusions(userId, data),
  },
  
  // Invalidation globale
  invalidateUser: (userId: string) => cache.invalidateUserCache(userId),
}

export default cache