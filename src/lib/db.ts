// src/lib/db.ts - Configuration Prisma avec cache Redis
import { PrismaClient } from '@prisma/client'
import { cache } from './cache'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Interface pour les options de cache DB
interface DbCacheOptions {
  ttl?: number
  prefix?: string
  invalidatePatterns?: string[]
}

export class CachedPrismaClient {
  static async cachedQuery<T>(
    cacheKey: string,
    queryFn: () => Promise<T>,
    options: DbCacheOptions = {}
  ): Promise<T> {
    const { ttl = 300, prefix = 'db:' } = options
    
    const cached = await cache.get<T>(cacheKey, { prefix, ttl })
    if (cached !== null) {
      console.log(`📦 DB Cache HIT: ${prefix}${cacheKey}`)
      return cached
    }
    
    console.log(`📦 DB Cache MISS: ${prefix}${cacheKey} - Exécution requête`)
    
    const result = await queryFn()
    await cache.set(cacheKey, result, { prefix, ttl })
    
    return result
  }

  static async invalidateCache(patterns: string[], prefix = 'db:'): Promise<void> {
    for (const pattern of patterns) {
      await cache.invalidatePattern(pattern, { prefix })
      console.log(`🧹 Cache DB invalidé: ${prefix}${pattern}`)
    }
  }

  static async findUserById(id: string, options: DbCacheOptions = {}) {
    return this.cachedQuery(
      `user:${id}`,
      () => prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      { ...options, ttl: options.ttl || 600 }
    )
  }

  static async findUserByEmail(email: string, options: DbCacheOptions = {}) {
    return this.cachedQuery(
      `user:email:${email}`,
      () => prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          emailVerified: true,
          hashedPassword: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      { ...options, ttl: options.ttl || 600 }
    )
  }

  static async updateUser(id: string, data: any) {
    const user = await prisma.user.update({
      where: { id },
      data
    })

    await this.invalidateCache([
      `user:${id}`,
      `user:email:${user.email}`,
      'users:count'
    ])

    return user
  }
}
export default prisma