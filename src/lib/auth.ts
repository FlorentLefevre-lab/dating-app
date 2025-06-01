// lib/auth.ts
import { NextAuthOptions } from "next-auth"
import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import FacebookProvider from "next-auth/providers/facebook"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./db"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
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
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          })

          if (!user) {
            console.log("❌ Utilisateur non trouvé:", credentials.email)
            return null
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
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },

  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.provider = account?.provider || "credentials"
        
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { emailVerified: true }
        })
        token.emailVerified = dbUser?.emailVerified
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
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! }
          })

          if (!existingUser) {
            console.log("❌ Tentative de création de compte OAuth bloquée:", user.email)
            return `/auth/error?error=OAuthAccountNotLinked&email=${encodeURIComponent(user.email!)}`
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
            console.log("✅ Compte OAuth lié:", account.provider)
          }
        } catch (error) {
          console.error("❌ Erreur lors de la vérification OAuth:", error)
          return false
        }
      }

      return true
    },

    // 🔥 MODIFIÉ: Redirection vers dashboard pour tous les types de connexion
    async redirect({ url, baseUrl }) {
      console.log("🔄 Redirection demandée:", { url, baseUrl })
      
      // Si c'est une URL relative, l'ajouter au baseUrl
      if (url.startsWith("/")) {
        const fullUrl = `${baseUrl}${url}`
        console.log("🔄 URL relative détectée:", fullUrl)
        
        // Si on redirige vers le profil, rediriger vers le dashboard à la place
        if (url === '/profile') {
          console.log("🏠 Redirection /profile → /dashboard")
          return `${baseUrl}/dashboard`
        }
        
        return fullUrl
      }
      
      // Si c'est une URL du même domaine
      if (new URL(url).origin === baseUrl) {
        const urlObj = new URL(url)
        
        // Si on redirige vers le profil, rediriger vers le dashboard à la place
        if (urlObj.pathname === '/profile') {
          console.log("🏠 Redirection URL complète /profile → /dashboard")
          return `${baseUrl}/dashboard`
        }
        
        return url
      }
      
      // Par défaut, rediriger vers le dashboard au lieu du profil
      console.log("🏠 Redirection par défaut vers /dashboard")
      return `${baseUrl}/dashboard`
    }
  },

  pages: {
    signIn: '/auth/login',
    signUp: '/auth/register', 
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
  },

  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log(`✅ Utilisateur connecté: ${user.email} via ${account?.provider}`)
    },
    async signOut({ session, token }) {
      console.log(`👋 Utilisateur déconnexé: ${session?.user?.email}`)
    },
  },

  debug: process.env.NODE_ENV === "development",
}

export default NextAuth(authOptions)