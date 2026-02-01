/**
 * Admin API: Admin Logs / Audit Trail
 * GET /api/admin/logs - List admin actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdmin, AdminContext } from '@/lib/middleware/authorize';
import { prisma } from '@/lib/db';
import { AdminActionType } from '@prisma/client';

async function handleGet(req: NextRequest, ctx: AdminContext) {
  // Only full admins can view all logs
  // Moderators can only see their own logs

  try {
    const { searchParams } = new URL(req.url);

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const skip = (page - 1) * limit;

    // Filters
    const adminId = searchParams.get('adminId');
    const targetUserId = searchParams.get('targetUserId');
    const actionType = searchParams.get('actionType') as AdminActionType | null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause
    const where: any = {};

    // Moderators can only see their own actions
    if (!ctx.isAdmin) {
      where.adminId = ctx.userId;
    } else if (adminId) {
      where.adminId = adminId;
    }

    if (targetUserId) {
      where.targetUserId = targetUserId;
    }

    if (actionType) {
      where.actionType = actionType;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Get logs
    const [logs, total] = await Promise.all([
      prisma.adminLog.findMany({
        where,
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            }
          },
          targetUser: {
            select: {
              id: true,
              name: true,
              email: true,
              accountStatus: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.adminLog.count({ where })
    ]);

    // Get action type stats (only for admins viewing all logs)
    let actionStats = null;
    if (ctx.isAdmin) {
      const stats = await prisma.adminLog.groupBy({
        by: ['actionType'],
        _count: { id: true },
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      });
      actionStats = stats.reduce((acc, s) => {
        acc[s.actionType] = s._count.id;
        return acc;
      }, {} as Record<string, number>);
    }

    // Get list of admins/moderators for filter dropdown (only for admins)
    let adminList = null;
    if (ctx.isAdmin) {
      adminList = await prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'MODERATOR'] }
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        orderBy: { name: 'asc' }
      });
    }

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      ...(actionStats && { actionStats }),
      ...(adminList && { adminList }),
      actionTypes: Object.values(AdminActionType),
    });

  } catch (error) {
    console.error('[ADMIN] Logs list error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recuperation des logs' },
      { status: 500 }
    );
  }
}

export const GET = withAdmin(handleGet);
