import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'

// GET - Récupérer les tickets de l'utilisateur
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const tickets = await prisma.ticket.findMany({
      where: { userId: session.user.id },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        assignee: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: tickets,
    })
  } catch (error) {
    console.error('[TICKETS] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la recuperation des tickets' },
      { status: 500 }
    )
  }
}

// POST - Créer un nouveau ticket
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const body = await request.json()
    const {
      subject,
      description,
      category,
      priority,
      userAgent,
      appVersion,
      screenSize,
      currentUrl,
      attachments,
    } = body

    // Validation
    if (!subject || !description || !category) {
      return NextResponse.json(
        { error: 'Sujet, description et categorie sont requis' },
        { status: 400 }
      )
    }

    if (subject.length < 5 || subject.length > 200) {
      return NextResponse.json(
        { error: 'Le sujet doit faire entre 5 et 200 caracteres' },
        { status: 400 }
      )
    }

    if (description.length < 10 || description.length > 5000) {
      return NextResponse.json(
        { error: 'La description doit faire entre 10 et 5000 caracteres' },
        { status: 400 }
      )
    }

    const validCategories = ['BUG', 'FEATURE_REQUEST', 'ACCOUNT_ISSUE', 'PAYMENT', 'HARASSMENT', 'TECHNICAL', 'OTHER']
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Categorie invalide' },
        { status: 400 }
      )
    }

    // Créer le ticket
    const ticket = await prisma.ticket.create({
      data: {
        userId: session.user.id,
        subject,
        description,
        category,
        priority: priority || 'MEDIUM',
        userAgent,
        appVersion,
        screenSize,
        currentUrl,
        attachments: attachments || [],
      },
    })

    return NextResponse.json({
      success: true,
      data: ticket,
      message: 'Ticket cree avec succes',
    })
  } catch (error) {
    console.error('[TICKETS] Error creating ticket:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la creation du ticket' },
      { status: 500 }
    )
  }
}
