// ===== src/app/api/chat/stream/webhook/route.ts =====
import { NextRequest, NextResponse } from 'next/server'
import { StreamChat } from 'stream-chat'
import { prisma } from '@/lib/db'
import { ReportCategory } from '@prisma/client'

const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY!
const apiSecret = process.env.STREAM_API_SECRET || process.env.STREAM_SECRET_KEY!
const serverClient = StreamChat.getInstance(apiKey, apiSecret)

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-signature')
    const body = await req.text()

    // SECURITY: Verify signature exists before verification
    if (!signature) {
      console.warn('[SECURITY] Webhook request without signature header')
      return NextResponse.json(
        { error: 'Signature manquante' },
        { status: 401 }
      )
    }

    // Verify webhook signature
    const isValid = serverClient.verifyWebhook(body, signature)
    if (!isValid) {
      console.warn('[SECURITY] Invalid webhook signature')
      return NextResponse.json(
        { error: 'Signature invalide' },
        { status: 401 }
      )
    }

    const event = JSON.parse(body)

    // Gérer différents types d'événements
    switch (event.type) {
      case 'message.new':
        // Envoyer notification push
        await sendPushNotification(event)
        break
      case 'channel.created':
        // Logger la création du channel
        console.log('Nouveau channel créé:', event.channel.id)
        break
      case 'member.added':
      case 'member.removed':
        // Gérer les changements de membres
        await handleMembershipChange(event)
        break
      case 'message.flagged':
        // Signalement d'un message (photo, texte, etc.)
        await handleMessageFlagged(event)
        break
      case 'user.flagged':
        // Signalement d'un utilisateur
        await handleUserFlagged(event)
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Erreur webhook Stream:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

async function sendPushNotification(event: any) {
  // Implémenter l'envoi de notifications push
  const { message, channel, user } = event
  
  // Récupérer les membres du channel sauf l'expéditeur
  const members = Object.keys(channel.members).filter(id => id !== user.id)
  
  // Envoyer notification à chaque membre
  for (const memberId of members) {
    // Vérifier les préférences de notification
    const settings = await prisma.notificationSettings.findUnique({
      where: { userId: memberId }
    })
    
    if (settings?.messageNotifications) {
      // Envoyer notification (Firebase, OneSignal, etc.)
      console.log(`Notification envoyée à ${memberId}`)
    }
  }
}

async function handleMembershipChange(event: any) {
  // Logger les changements de membres
  console.log(`Membre ${event.type}:`, event.member.user_id)
}

/**
 * Gère les signalements de messages depuis Stream Chat
 * Crée un Report dans la base de données
 */
async function handleMessageFlagged(event: any) {
  try {
    const { message, user: flaggingUser } = event

    if (!message || !flaggingUser) {
      console.warn('[WEBHOOK] message.flagged: données manquantes', event)
      return
    }

    const reporterId = flaggingUser.id
    const targetUserId = message.user?.id

    if (!targetUserId) {
      console.warn('[WEBHOOK] message.flagged: targetUserId manquant')
      return
    }

    // Ne pas permettre de se signaler soi-même
    if (reporterId === targetUserId) {
      console.log('[WEBHOOK] Auto-signalement ignoré')
      return
    }

    // Vérifier que les deux utilisateurs existent
    const [reporter, targetUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: reporterId }, select: { id: true } }),
      prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } })
    ])

    if (!reporter || !targetUser) {
      console.warn('[WEBHOOK] Utilisateur non trouvé:', { reporterId, targetUserId })
      return
    }

    // Vérifier si un signalement similaire existe déjà (dernières 24h)
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId,
        targetUserId,
        status: { in: ['PENDING', 'UNDER_REVIEW'] },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    })

    if (existingReport) {
      console.log('[WEBHOOK] Signalement dupliqué ignoré:', existingReport.id)
      return
    }

    // Extraire les URLs des attachments (photos, etc.)
    const evidenceUrls: string[] = []
    if (message.attachments && Array.isArray(message.attachments)) {
      for (const attachment of message.attachments) {
        if (attachment.image_url) {
          evidenceUrls.push(attachment.image_url)
        } else if (attachment.asset_url) {
          evidenceUrls.push(attachment.asset_url)
        } else if (attachment.thumb_url) {
          evidenceUrls.push(attachment.thumb_url)
        }
      }
    }

    // Déterminer la catégorie - par défaut INAPPROPRIATE_CONTENT pour les messages avec photos
    let category: ReportCategory = ReportCategory.INAPPROPRIATE_CONTENT
    if (evidenceUrls.length === 0 && message.text) {
      // Si pas de photos mais du texte, c'est peut-être du harcèlement
      category = ReportCategory.HARASSMENT
    }

    // Construire la description
    let description = `Signalement via le chat Stream\n`
    description += `Message ID: ${message.id}\n`
    description += `Channel: ${message.channel_id || 'N/A'}\n`
    if (message.text) {
      description += `Contenu du message: "${message.text.substring(0, 500)}"\n`
    }
    if (evidenceUrls.length > 0) {
      description += `Nombre de photos/fichiers: ${evidenceUrls.length}\n`
    }

    // Déterminer la priorité
    let priority = 1 // Medium par défaut pour les signalements de chat
    if (evidenceUrls.length > 0) {
      priority = 2 // High si des photos sont impliquées
    }

    // Créer le signalement
    const report = await prisma.report.create({
      data: {
        reporterId,
        targetUserId,
        category,
        description,
        evidenceUrls,
        priority,
      }
    })

    // Mettre à jour le compteur de signalements en attente
    await prisma.globalStats.upsert({
      where: { id: 'singleton' },
      update: {
        pendingReports: { increment: 1 },
        lastCalculated: new Date(),
      },
      create: {
        id: 'singleton',
        pendingReports: 1,
      }
    })

    console.log('[WEBHOOK] Signalement créé:', {
      reportId: report.id,
      category: report.category,
      hasPhotos: evidenceUrls.length > 0
    })

  } catch (error) {
    console.error('[WEBHOOK] Erreur handleMessageFlagged:', error)
  }
}

/**
 * Gère les signalements d'utilisateurs depuis Stream Chat
 * Crée un Report dans la base de données
 */
async function handleUserFlagged(event: any) {
  try {
    const { target_user: targetUser, user: flaggingUser } = event

    if (!targetUser || !flaggingUser) {
      console.warn('[WEBHOOK] user.flagged: données manquantes', event)
      return
    }

    const reporterId = flaggingUser.id
    const targetUserId = targetUser.id

    // Ne pas permettre de se signaler soi-même
    if (reporterId === targetUserId) {
      console.log('[WEBHOOK] Auto-signalement ignoré')
      return
    }

    // Vérifier que les deux utilisateurs existent
    const [reporter, target] = await Promise.all([
      prisma.user.findUnique({ where: { id: reporterId }, select: { id: true } }),
      prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } })
    ])

    if (!reporter || !target) {
      console.warn('[WEBHOOK] Utilisateur non trouvé:', { reporterId, targetUserId })
      return
    }

    // Vérifier si un signalement similaire existe déjà (dernières 24h)
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId,
        targetUserId,
        status: { in: ['PENDING', 'UNDER_REVIEW'] },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    })

    if (existingReport) {
      console.log('[WEBHOOK] Signalement dupliqué ignoré:', existingReport.id)
      return
    }

    // Construire la description
    const description = `Signalement d'utilisateur via le chat Stream\nUtilisateur signalé: ${targetUser.name || targetUser.id}`

    // Créer le signalement
    const report = await prisma.report.create({
      data: {
        reporterId,
        targetUserId,
        category: ReportCategory.OTHER,
        description,
        priority: 1, // Medium
      }
    })

    // Mettre à jour le compteur de signalements en attente
    await prisma.globalStats.upsert({
      where: { id: 'singleton' },
      update: {
        pendingReports: { increment: 1 },
        lastCalculated: new Date(),
      },
      create: {
        id: 'singleton',
        pendingReports: 1,
      }
    })

    console.log('[WEBHOOK] Signalement utilisateur créé:', {
      reportId: report.id,
      targetUserId
    })

  } catch (error) {
    console.error('[WEBHOOK] Erreur handleUserFlagged:', error)
  }
}