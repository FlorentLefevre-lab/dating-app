// src/lib/redis.ts - Version avec diagnostic approfondi
import Redis from 'ioredis'

class RedisClient {
  private static instance: Redis | null = null
  private static isConnected = false
  private static connectionAttempted = false
  private static connectionPromise: Promise<void> | null = null

  static getInstance(): Redis {
    if (!this.instance && !this.connectionAttempted) {
      this.connectionAttempted = true
      
      console.log('🔄 [Next.js] Initialisation Redis...')
      console.log('📋 [Next.js] Configuration:', {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || '6379',
        hasPassword: !!process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || '0',
        env: process.env.NODE_ENV
      })

      this.instance = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        connectTimeout: 10000,
        commandTimeout: 5000,
        keepAlive: 30000,
        family: 4,
        db: parseInt(process.env.REDIS_DB || '0'),
      })

      this.instance.on('connect', () => {
        console.log('✅ [Next.js] Redis connecté')
        this.isConnected = true
      })

      this.instance.on('ready', () => {
        console.log('🚀 [Next.js] Redis prêt')
      })

      this.instance.on('error', (err) => {
        console.error('❌ [Next.js] Erreur Redis:', err.message)
        console.error('🔧 [Next.js] Vérifiez que Redis est accessible depuis Next.js')
        this.isConnected = false
      })

      this.instance.on('close', () => {
        console.log('🔌 [Next.js] Connexion Redis fermée')
        this.isConnected = false
      })

      this.instance.on('reconnecting', (ms) => {
        console.log(`🔄 [Next.js] Redis reconnexion dans ${ms}ms...`)
      })

      // Test de connexion initial FORCÉ
      this.forceTestConnection()
    }

    return this.instance!
  }

  private static async forceTestConnection() {
    if (!this.connectionPromise) {
      this.connectionPromise = this.testConnection()
    }
    return this.connectionPromise
  }

  private static async testConnection() {
    try {
      console.log('🧪 [Next.js] Test de connexion Redis forcé...')
      const redis = this.getInstance()
      
      // Forcer la connexion
      await redis.connect()
      
      // Test ping
      const pong = await redis.ping()
      console.log('✅ [Next.js] Test Redis réussi:', pong)
      
      // Test set/get
      await redis.set('nextjs:test', 'Hello from Next.js!')
      const value = await redis.get('nextjs:test')
      console.log('📦 [Next.js] Test cache:', value)
      
      // Nettoyer
      await redis.del('nextjs:test')
      
      this.isConnected = true
      console.log('🎉 [Next.js] Redis complètement opérationnel!')
      
    } catch (error) {
      console.error('❌ [Next.js] Test Redis échoué:', error.message)
      console.log('💡 [Next.js] Redis fonctionnera en mode fallback (cache mémoire uniquement)')
      this.isConnected = false
    }
  }

  static isHealthy(): boolean {
    const healthy = this.isConnected && this.instance !== null
    if (!healthy) {
      console.log('⚠️ [Next.js] Redis pas healthy, utilisation cache mémoire')
    }
    return healthy
  }

  static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.quit()
      this.instance = null
      this.isConnected = false
      this.connectionAttempted = false
      this.connectionPromise = null
    }
  }
}

export const redis = RedisClient.getInstance()
export const isRedisHealthy = () => RedisClient.isHealthy()
export const disconnectRedis = () => RedisClient.disconnect()

export default redis