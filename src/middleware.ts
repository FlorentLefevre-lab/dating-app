// src/middleware.ts
import { auth } from "./auth"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  console.log(`🔍 Middleware: ${pathname}, Auth: ${isLoggedIn}`)

  // Routes qui nécessitent une authentification
  const protectedRoutes = ['/dashboard', '/profile', '/matches', '/discover', '/chat']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // Routes publiques
  const publicRoutes = ['/auth/', '/', '/api/auth']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Redirection si pas connecté sur route protégée
  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL('/auth/login', req.nextUrl.origin)
    loginUrl.searchParams.set('callbackUrl', pathname)
    console.log(`🔄 Redirection vers login: ${loginUrl}`)
    return Response.redirect(loginUrl)
  }

  // Redirection si connecté sur page auth (sauf error)
  if (isLoggedIn && pathname.startsWith('/auth/') && pathname !== '/auth/error') {
    console.log(`🏠 Redirection vers dashboard`)
    return Response.redirect(new URL('/dashboard', req.nextUrl.origin))
  }

  // Route racine
  if (pathname === '/') {
    const targetUrl = isLoggedIn ? '/dashboard' : '/auth/login'
    console.log(`🏠 Redirection racine vers: ${targetUrl}`)
    return Response.redirect(new URL(targetUrl, req.nextUrl.origin))
  }

  return
})

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.).*)'],
}