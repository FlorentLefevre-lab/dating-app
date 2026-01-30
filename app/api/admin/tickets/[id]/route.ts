import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAdminAccess } from '@/lib/admin/auth'
import { logAdminAction } from '@/lib/admin/logging'

// GET - Récupérer un ticket (admin)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAdminAccess()
  if (!authResult.authorized) {
    return authResult.error
  }

  const { id } = await params

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
            accountStatus: true,
          },
        },
        assignee: {
          select: { id: true, name: true, image: true },
        },
        resolver: {
          select: { id: true, name: true },
        },
        messages: {
          include: {
            user: {
              select: { id: true, name: true, image: true, role: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket non trouve' }, { status: 404 })
    }

    // Récupérer les autres tickets de cet utilisateur
    const userTickets = await prisma.ticket.count({
      where: { userId: ticket.userId },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...ticket,
        userTicketsCount: userTickets,
      },
    })
  } catch (error) {
    console.error('[ADMIN TICKET] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la recuperation du ticket' },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour un ticket (admin)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAdminAccess()
  if (!authResult.authorized) {
    return authResult.error
  }

  const { id } = await params

  try {
    const body = await request.json()
    const { status, priority, assignedTo, resolution } = body

    const ticket = await prisma.ticket.findUnique({
      where: { id },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket non trouve' }, { status: 404 })
    }

    // Préparer les données de mise à jour
    const updateData: Record<string, unknown> = {}

    if (status) {
      updateData.status = status

      // Si résolu ou fermé, enregistrer qui et quand
      if (status === 'RESOLVED' || status === 'CLOSED') {
        updateData.resolvedAt = new Date()
        updateData.resolvedBy = authResult.userId
        if (resolution) {
          updateData.resolution = resolution
        }
      }
    }

    if (priority) {
      updateData.priority = priority
    }

    if (assignedTo !== undefined) {
      updateData.assignedTo = assignedTo || null
    }

    if (resolution && status !== 'RESOLVED' && status !== 'CLOSED') {
      updateData.resolution = resolution
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        assignee: {
          select: { id: true, name: true },
        },
      },
    })

    // Logger l'action
    if (authResult.userId) {
      await logAdminAction({
        adminId: authResult.userId,
        targetUserId: ticket.userId,
        actionType: 'SETTINGS_UPDATED',
        details: {
          ticketId: id,
          changes: Object.keys(updateData),
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: updatedTicket,
      message: 'Ticket mis a jour',
    })
  } catch (error) {
    console.error('[ADMIN TICKET] Error updating:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise a jour du ticket' },
      { status: 500 }
    )
  }
}

// POST - Ajouter un message admin au ticket
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAdminAccess()
  if (!authResult.authorized) {
    return authResult.error
  }

  const { id } = await params

  try {
    const body = await request.json()
    const { message } = body

    if (!message || message.trim().length < 1) {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 })
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket non trouve' }, { status: 404 })
    }

    // Créer le message
    const ticketMessage = await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        userId: authResult.userId!,
        message: message.trim(),
        isAdmin: true,
      },
      include: {
        user: {
          select: { id: true, name: true, image: true, role: true },
        },
      },
    })

    // Mettre à jour le statut si nécessaire
    if (ticket.status === 'OPEN') {
      await prisma.ticket.update({
        where: { id },
        data: { status: 'IN_PROGRESS' },
      })
    } else if (ticket.status === 'IN_PROGRESS') {
      await prisma.ticket.update({
        where: { id },
        data: { status: 'WAITING_USER' },
      })
    }

    return NextResponse.json({
      success: true,
      data: ticketMessage,
    })
  } catch (error) {
    console.error('[ADMIN TICKET MESSAGE] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout du message' },
      { status: 500 }
    )
  }
}
