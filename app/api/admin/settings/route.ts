import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAdminAccess } from '@/lib/admin/auth'
import { logAdminAction } from '@/lib/admin/logging'

// Valeurs par défaut pour créer les settings si inexistants
const defaultSettings = {
  id: 'singleton',
  // Modération
  nsfwThreshold: 0.7,
  reportsBeforeAutoSuspend: 5,
  suspensionDurations: [1, 7, 30, -1],
  autoApprovePhotos: false,
  // Limites utilisateurs
  dailyLikesLimit: 50,
  dailyLikesLimitPremium: 999,
  dailySuperLikesLimit: 1,
  dailySuperLikesLimitPremium: 5,
  maxPhotosPerUser: 6,
  dailyMessagesLimitNewUsers: 20,
  dailyRewindsLimit: 0,
  dailyRewindsLimitPremium: 5,
  // Inscription
  minAge: 18,
  maxAge: 99,
  emailVerificationRequired: true,
  registrationOpen: true,
  allowedRegions: [],
  // Matching
  defaultMaxDistance: 100,
  maxDistanceLimit: 500,
  defaultAgeRange: 10,
  // Feature flags
  maintenanceMode: false,
  maintenanceMessage: "L'application est en maintenance. Veuillez réessayer plus tard.",
  premiumEnabled: true,
  videoChatEnabled: false,
  storiesEnabled: false,
  boostEnabled: true,
  // Messages système
  globalAnnouncement: '',
  announcementType: 'info',
  welcomeMessage: 'Bienvenue sur FlowDating ! Complétez votre profil pour commencer.',
  termsUrl: '/terms',
  privacyUrl: '/privacy',
  // Sécurité
  maxLoginAttempts: 5,
  loginBlockDuration: 15,
  sessionExpirationHours: 168,
  forceHttps: true,
}

// GET - Récupérer les paramètres
export async function GET() {
  const authResult = await verifyAdminAccess()
  if (!authResult.authorized) {
    return authResult.error
  }

  try {
    // Récupérer ou créer les settings
    let settings = await prisma.appSettings.findUnique({
      where: { id: 'singleton' },
    })

    if (!settings) {
      settings = await prisma.appSettings.create({
        data: defaultSettings,
      })
    }

    // Informations système (lecture seule)
    const systemInfo = {
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      databaseStatus: 'connected',
      uptime: process.uptime(),
    }

    // Vérifier le statut de la DB
    try {
      await prisma.$queryRaw`SELECT 1`
    } catch {
      systemInfo.databaseStatus = 'disconnected'
    }

    return NextResponse.json({
      success: true,
      data: {
        settings,
        systemInfo,
      },
    })
  } catch (error) {
    console.error('[ADMIN SETTINGS] Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des paramètres' },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour les paramètres
export async function PUT(request: Request) {
  const authResult = await verifyAdminAccess()
  if (!authResult.authorized) {
    return authResult.error
  }

  try {
    const body = await request.json()
    const { settings: newSettings } = body

    if (!newSettings || typeof newSettings !== 'object') {
      return NextResponse.json(
        { error: 'Paramètres invalides' },
        { status: 400 }
      )
    }

    // Validation des valeurs
    const validationErrors: string[] = []

    // Validation modération
    if (newSettings.nsfwThreshold !== undefined) {
      if (newSettings.nsfwThreshold < 0 || newSettings.nsfwThreshold > 1) {
        validationErrors.push('Le seuil NSFW doit être entre 0 et 1')
      }
    }

    if (newSettings.reportsBeforeAutoSuspend !== undefined) {
      if (newSettings.reportsBeforeAutoSuspend < 1 || newSettings.reportsBeforeAutoSuspend > 100) {
        validationErrors.push('Le nombre de signalements doit être entre 1 et 100')
      }
    }

    // Validation limites
    if (newSettings.dailyLikesLimit !== undefined) {
      if (newSettings.dailyLikesLimit < 0 || newSettings.dailyLikesLimit > 9999) {
        validationErrors.push('La limite de likes doit être entre 0 et 9999')
      }
    }

    if (newSettings.maxPhotosPerUser !== undefined) {
      if (newSettings.maxPhotosPerUser < 1 || newSettings.maxPhotosPerUser > 20) {
        validationErrors.push('Le nombre max de photos doit être entre 1 et 20')
      }
    }

    // Validation inscription
    if (newSettings.minAge !== undefined) {
      if (newSettings.minAge < 18 || newSettings.minAge > 99) {
        validationErrors.push('L\'âge minimum doit être entre 18 et 99')
      }
    }

    if (newSettings.maxAge !== undefined) {
      if (newSettings.maxAge < 18 || newSettings.maxAge > 120) {
        validationErrors.push('L\'âge maximum doit être entre 18 et 120')
      }
    }

    if (newSettings.minAge !== undefined && newSettings.maxAge !== undefined) {
      if (newSettings.minAge > newSettings.maxAge) {
        validationErrors.push('L\'âge minimum ne peut pas être supérieur à l\'âge maximum')
      }
    }

    // Validation matching
    if (newSettings.defaultMaxDistance !== undefined) {
      if (newSettings.defaultMaxDistance < 1 || newSettings.defaultMaxDistance > 1000) {
        validationErrors.push('La distance par défaut doit être entre 1 et 1000 km')
      }
    }

    if (newSettings.maxDistanceLimit !== undefined) {
      if (newSettings.maxDistanceLimit < 1 || newSettings.maxDistanceLimit > 5000) {
        validationErrors.push('La distance max doit être entre 1 et 5000 km')
      }
    }

    // Validation sécurité
    if (newSettings.maxLoginAttempts !== undefined) {
      if (newSettings.maxLoginAttempts < 1 || newSettings.maxLoginAttempts > 20) {
        validationErrors.push('Les tentatives de connexion doivent être entre 1 et 20')
      }
    }

    if (newSettings.sessionExpirationHours !== undefined) {
      if (newSettings.sessionExpirationHours < 1 || newSettings.sessionExpirationHours > 8760) {
        validationErrors.push('L\'expiration de session doit être entre 1h et 1 an')
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Erreurs de validation', details: validationErrors },
        { status: 400 }
      )
    }

    // Préparer les données à mettre à jour (exclure les champs non modifiables)
    const { id: _id, updatedAt: _updatedAt, ...updateData } = newSettings

    // Mettre à jour les paramètres
    const updatedSettings = await prisma.appSettings.upsert({
      where: { id: 'singleton' },
      update: {
        ...updateData,
        updatedBy: authResult.user?.id,
      },
      create: {
        ...defaultSettings,
        ...updateData,
        updatedBy: authResult.user?.id,
      },
    })

    // Logger l'action
    if (authResult.user?.id) {
      await logAdminAction({
        adminId: authResult.user.id,
        actionType: 'SETTINGS_UPDATED',
        details: {
          changes: Object.keys(updateData),
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: updatedSettings,
      message: 'Paramètres mis à jour avec succès',
    })
  } catch (error) {
    console.error('[ADMIN SETTINGS] Error updating settings:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour des paramètres' },
      { status: 500 }
    )
  }
}

// POST - Réinitialiser les paramètres par défaut
export async function POST(request: Request) {
  const authResult = await verifyAdminAccess()
  if (!authResult.authorized) {
    return authResult.error
  }

  try {
    const body = await request.json()
    const { action } = body

    if (action !== 'reset') {
      return NextResponse.json(
        { error: 'Action non reconnue' },
        { status: 400 }
      )
    }

    // Réinitialiser aux valeurs par défaut
    const resetSettings = await prisma.appSettings.upsert({
      where: { id: 'singleton' },
      update: {
        ...defaultSettings,
        updatedBy: authResult.user?.id,
      },
      create: {
        ...defaultSettings,
        updatedBy: authResult.user?.id,
      },
    })

    // Logger l'action
    if (authResult.user?.id) {
      await logAdminAction({
        adminId: authResult.user.id,
        actionType: 'SETTINGS_UPDATED',
        details: {
          action: 'reset_to_defaults',
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: resetSettings,
      message: 'Paramètres réinitialisés aux valeurs par défaut',
    })
  } catch (error) {
    console.error('[ADMIN SETTINGS] Error resetting settings:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la réinitialisation des paramètres' },
      { status: 500 }
    )
  }
}
