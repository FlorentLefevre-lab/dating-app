import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Chemins publics (sans authentification)
const publicPaths = new Set([
  '/',
  '/auth/login',
  '/auth/register', 
  '/auth/error',
  '/auth/verify-email',
  '/auth/reset-password',
  '/api/health',
  '/api/monitoring/health',
  '/api/ping',
])

function isPublicPath(pathname: string): boolean {
  if (publicPaths.has(pathname)) return true
  if (pathname.startsWith('/api/auth/')) return true
  if (pathname.startsWith('/_next/') || 
      pathname.startsWith('/favicon') || 
      pathname.includes('.')) return true
  return false
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Autoriser les chemins publics
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }
  
  // Vérifier l'authentification via les cookies de session
  const sessionToken = request.cookies.get('authjs.session-token') || 
                      request.cookies.get('__Secure-authjs.session-token')
  
  // Si pas de token de session, rediriger vers login
  if (!sessionToken) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  // Token présent, continuer
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}