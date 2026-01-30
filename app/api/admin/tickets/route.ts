import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAdminAccess } from '@/lib/admin/auth'

// GET - Récupérer tous les tickets (admin)
export async function GET(request: Request) {
  const authResult = await verifyAdminAccess()
  if (!authResult.authorized) {
    return authResult.error
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const category = searchParams.get('category')
  const priority = searchParams.get('priority')
  const assignedTo = searchParams.get('assignedTo')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  try {
    // Construire les filtres
    const where: Record<string, unknown> = {}

    if (status && status !== 'all') {
      where.status = status
    }
    if (category && category !== 'all') {
      where.category = category
    }
    if (priority && priority !== 'all') {
      where.priority = priority
    }
    if (assignedTo === 'unassigned') {
      where.assignedTo = null
    } else if (assignedTo === 'me' && authResult.user?.id) {
      where.assignedTo = authResult.user.id
    } else if (assignedTo && assignedTo !== 'all') {
      where.assignedTo = assignedTo
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
          assignee: {
            select: { id: true, name: true, image: true },
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.ticket.count({ where }),
    ])

    // Stats rapides
    const [openCount, inProgressCount, waitingCount, criticalCount] = await Promise.all([
      prisma.ticket.count({ where: { status: 'OPEN' } }),
      prisma.ticket.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.ticket.count({ where: { status: 'WAITING_USER' } }),
      prisma.ticket.count({ where: { priority: 'CRITICAL', status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
    ])

    return NextResponse.json({
      success: true,
      data: tickets,
      stats: {
        open: openCount,
        inProgress: inProgressCount,
        waiting: waitingCount,
        critical: criticalCount,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('[ADMIN TICKETS] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la recuperation des tickets' },
      { status: 500 }
    )
  }
}
