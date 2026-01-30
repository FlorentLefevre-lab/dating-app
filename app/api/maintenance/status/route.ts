import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'

// API publique pour vérifier le mode maintenance
export async function GET() {
  try {
    // Récupérer les settings
    const settings = await prisma.appSettings.findUnique({
      where: { id: 'singleton' },
      select: {
        maintenanceMode: true,
        maintenanceMessage: true,
        globalAnnouncement: true,
        announcementType: true,
      },
    })

    // Si pas de settings, pas de maintenance
    if (!settings) {
      return NextResponse.json({
        maintenance: false,
        message: null,
        announcement: null,
        announcementType: null,
      })
    }

    // Vérifier si l'utilisateur est admin (il peut bypass la maintenance)
    let isAdmin = false
    try {
      const session = await auth()
      if (session?.user) {
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { role: true },
        })
        isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR'
      }
    } catch {
      // Pas de session, pas admin
    }

    return NextResponse.json({
      maintenance: settings.maintenanceMode && !isAdmin,
      message: settings.maintenanceMode ? settings.maintenanceMessage : null,
      announcement: settings.globalAnnouncement || null,
      announcementType: settings.announcementType || 'info',
      isAdmin,
    })
  } catch (error) {
    console.error('[MAINTENANCE STATUS] Error:', error)
    // En cas d'erreur, on ne bloque pas l'accès
    return NextResponse.json({
      maintenance: false,
      message: null,
      announcement: null,
      announcementType: null,
    })
  }
}
