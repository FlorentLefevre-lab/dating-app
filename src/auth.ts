// src/auth.ts - Configuration NextAuth v5 avec cache Redis - CORRIGÉ
import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import FacebookProvider from "next-auth/providers/facebook"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./lib/db"
import { cache, userCache, sessionCache } from "./lib/cache"
import bcrypt from "bcryptjs"

interface CachedUser {
  id: string
  email: string
  name: string | null
  image: string | null
  hashedPassword: string | null
  emailVerified: Date | null
  provider?: string
}

const authConfig = {
  adapter: PrismaAdapter(prisma),
  
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "votre.email@example.com"
        },
        password: {
          label: "Mot de passe",
          type: "password"
        }
      },
      async authorize(credentials) {
        console.log("🔐 AUTHORIZE APPELÉ avec:", credentials?.email)
        
        if (!credentials?.email || !credentials?.password) {
          console.log("❌ Email ou mot de passe manquant")
          return null
        }

        try {
          let user = await userCache.get(credentials.email)
          
          if (!user) {
            console.log("📦 Cache MISS - Requête DB pour:", credentials.email)
            
            const dbUser = await prisma.user.findUnique({
              where: { email: credentials.email },
              select: {
                id: true,
                email: true,
                name: true,
                image: true,
                hashedPassword: true,
                emailVerified: true
              }
            })

            if (!dbUser) {
              console.log("❌ Utilisateur non trouvé:", credentials.email)
              return null
            }

            user = dbUser as CachedUser
            await userCache.set(credentials.email, user)
            console.log("📦 Utilisateur mis en cache:", credentials.email)
          } else {
            console.log("📦 Cache HIT pour utilisateur:", credentials.email)
          }

          if (!user.hashedPassword) {
            console.log("❌ Utilisateur sans mot de passe (compte OAuth uniquement)")
            return null
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.hashedPassword
          )

          if (!isPasswordValid) {
            console.log("❌ Mot de passe incorrect")
            return null
          }

          console.log("✅ Authentification credentials réussie:", user.email)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          }
        } catch (error) {
          console.error("❌ Erreur lors de l'authentification:", error)
          return null
        }
      }
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),

    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
  ],

  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },

  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-authjs.session-token'
        : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60,
      },
    },
  },

  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.provider = account?.provider || "credentials"
        
        try {
          const userKey = `verification:${user.id}`
          let emailVerified = await cache.get(userKey, { prefix: 'auth:', ttl: 900 })
          
          if (emailVerified === null) {
            console.log("📦 Cache MISS - Requête DB pour vérification:", user.id)
            
            const dbUser = await prisma.user.findUnique({
              where: { id: user.id },
              select: { emailVerified: true }
            })
            
            emailVerified = dbUser?.emailVerified || null
            
            await cache.set(userKey, emailVerified, { prefix: 'auth:', ttl: 900 })
            console.log("📦 Statut vérification mis en cache:", user.id)
          } else {
            console.log("📦 Cache HIT pour vérification:", user.id)
          }
          
          token.emailVerified = emailVerified
        } catch (error) {
          console.error("❌ Erreur lors de la récupération du statut de vérification:", error)
        }
      }
      
      if (token.id) {
        await sessionCache.set(token.id, {
          userId: token.id,
          email: token.email,
          provider: token.provider,
          lastAccess: new Date()
        })
      }
      
      return token
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.provider = token.provider as string
        session.user.emailVerified = token.emailVerified as Date | null
      }
      
      return session
    },

    async signIn({ user, account, profile }) {
      console.log(`🔑 Tentative de connexion: ${user.email} via ${account?.provider}`)
      
      if (account?.provider === "google" || account?.provider === "facebook") {
        try {
          let existingUser = await userCache.get(user.email!)
          
          if (!existingUser) {
            console.log("📦 Cache MISS - Vérification DB utilisateur OAuth:", user.email)
            
            const dbUser = await prisma.user.findUnique({
              where: { email: user.email! },
              select: {
                id: true,
                email: true,
                name: true,
                image: true,
                hashedPassword: true,
                emailVerified: true
              }
            })

            if (!dbUser) {
              console.log("❌ Tentative de création de compte OAuth bloquée:", user.email)
              return `/auth/error?error=OAuthAccountNotLinked&email=${encodeURIComponent(user.email!)}`
            }

            existingUser = dbUser as CachedUser
            await userCache.set(user.email!, existingUser)
            console.log("📦 Utilisateur OAuth mis en cache:", user.email)
          } else {
            console.log("📦 Cache HIT pour utilisateur OAuth:", user.email)
          }

          const existingAccount = await prisma.account.findFirst({
            where: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            }
          })

          if (!existingAccount) {
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
              }
            })
            
            await userCache.delete(user.email!)
            console.log("✅ Compte OAuth lié et cache invalidé:", account.provider)
          }
        } catch (error) {
          console.error("❌ Erreur lors de la vérification OAuth:", error)
          return false
        }
      }
      return true
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    }
  },

  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
    verifyRequest: '/auth/verify-email',
  },

  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log(`✅ Utilisateur connecté: ${user.email} via ${account?.provider}`)
      
      if (user.id) {
        await cache.set(
          `login:${user.id}:${Date.now()}`, 
          {
            userId: user.id,
            email: user.email,
            provider: account?.provider,
            timestamp: new Date(),
            isNewUser
          },
          { prefix: 'analytics:', ttl: 86400 }
        )
      }
    },
    
    async signOut({ session, token }) {
      console.log(`👋 Utilisateur déconnecté`)
      
      if (token?.id) {
        await sessionCache.delete(token.id as string)
        await cache.delete(`verification:${token.id}`, { prefix: 'auth:' })
        console.log("🧹 Cache de session nettoyé pour:", token.id)
      }
    },
  },

  debug: process.env.NODE_ENV === "development",
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)

export async function invalidateUserCache(email: string, userId?: string) {
  await userCache.delete(email)
  if (userId) {
    await sessionCache.delete(userId)
    await cache.delete(`verification:${userId}`, { prefix: 'auth:' })
  }
  console.log("🧹 Cache utilisateur invalidé:", email)
}