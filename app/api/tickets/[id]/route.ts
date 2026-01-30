import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'

// GET - Récupérer un ticket avec ses messages
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const { id } = await params

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
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

    // Vérifier que l'utilisateur a accès (propriétaire ou admin)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR'
    if (ticket.userId !== session.user.id && !isAdmin) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      data: ticket,
    })
  } catch (error) {
    console.error('[TICKET] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la recuperation du ticket' },
      { status: 500 }
    )
  }
}

// POST - Ajouter un message au ticket
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { message } = body

    if (!message || message.trim().length < 1) {
      return NextResponse.json(
        { error: 'Message requis' },
        { status: 400 }
      )
    }

    // Vérifier que le ticket existe et que l'utilisateur y a accès
    const ticket = await prisma.ticket.findUnique({
      where: { id },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket non trouve' }, { status: 404 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR'
    if (ticket.userId !== session.user.id && !isAdmin) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
    }

    // Créer le message
    const ticketMessage = await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        userId: session.user.id,
        message: message.trim(),
        isAdmin,
      },
      include: {
        user: {
          select: { id: true, name: true, image: true, role: true },
        },
      },
    })

    // Si c'est un admin qui répond, mettre le ticket en attente user
    // Si c'est l'utilisateur qui répond, remettre en cours si c'était en attente
    if (isAdmin && ticket.status === 'OPEN') {
      await prisma.ticket.update({
        where: { id },
        data: { status: 'IN_PROGRESS' },
      })
    } else if (isAdmin && ticket.status === 'IN_PROGRESS') {
      await prisma.ticket.update({
        where: { id },
        data: { status: 'WAITING_USER' },
      })
    } else if (!isAdmin && ticket.status === 'WAITING_USER') {
      await prisma.ticket.update({
        where: { id },
        data: { status: 'IN_PROGRESS' },
      })
    }

    return NextResponse.json({
      success: true,
      data: ticketMessage,
    })
  } catch (error) {
    console.error('[TICKET MESSAGE] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout du message' },
      { status: 500 }
    )
  }
}
