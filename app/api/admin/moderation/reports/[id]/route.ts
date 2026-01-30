/**
 * Admin API: Single Report Management
 * GET /api/admin/moderation/reports/[id] - Get report details
 * PATCH /api/admin/moderation/reports/[id] - Update report status
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAndParams, AdminContext, logAdminAction } from '@/lib/middleware/authorize';
import { prisma } from '@/lib/db';
import { ReportStatus, AccountStatus } from '@prisma/client';

type RouteParams = { id: string };

// Helper pour les labels de catégorie
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    INAPPROPRIATE_CONTENT: 'Contenu inapproprie',
    HARASSMENT: 'Harcelement',
    FAKE_PROFILE: 'Faux profil',
    SPAM: 'Spam',
    UNDERAGE: 'Mineur',
    SCAM: 'Arnaque',
    OTHER: 'Autre',
  };
  return labels[category] || category;
}

// Get report details
async function handleGet(
  req: NextRequest,
  ctx: AdminContext,
  params: RouteParams
) {
  try {
    const report = await prisma.report.findUnique({
      where: { id: params.id },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            _count: {
              select: {
                reportsSubmitted: true,
              }
            }
          }
        },
        targetUser: {
          select: {
            id: true,
            name: true,
            email: true,
            accountStatus: true,
            createdAt: true,
            bio: true,
            photos: {
              select: {
                id: true,
                url: true,
                moderationStatus: true,
              }
            },
            _count: {
              select: {
                reportsReceived: true,
              }
            }
          }
        },
        resolver: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Signalement non trouve' },
        { status: 404 }
      );
    }

    // Get other reports against this user
    const otherReports = await prisma.report.findMany({
      where: {
        targetUserId: report.targetUserId,
        id: { not: params.id },
      },
      select: {
        id: true,
        category: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Get admin actions taken against this user
    const adminActions = await prisma.adminLog.findMany({
      where: {
        targetUserId: report.targetUserId,
      },
      select: {
        id: true,
        actionType: true,
        details: true,
        createdAt: true,
        admin: {
          select: {
            name: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return NextResponse.json({
      success: true,
      report,
      context: {
        otherReports,
        adminActions,
        totalReportsAgainstUser: report.targetUser._count.reportsReceived,
      }
    });

  } catch (error) {
    console.error('[ADMIN] Get report error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recuperation' },
      { status: 500 }
    );
  }
}

// Update report status and optionally take action
async function handlePatch(
  req: NextRequest,
  ctx: AdminContext,
  params: RouteParams
) {
  try {
    const body = await req.json();
    const { status, resolution, actions } = body;
    // Support ancien format (userAction) pour rétrocompatibilité
    const userActions: string[] = actions || (body.userAction ? [body.userAction] : []);

    // Validate status
    if (!status || !Object.values(ReportStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Statut invalide' },
        { status: 400 }
      );
    }

    // Get current report
    const report = await prisma.report.findUnique({
      where: { id: params.id },
      include: {
        targetUser: {
          select: {
            id: true,
            email: true,
            accountStatus: true,
          }
        }
      }
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Signalement non trouve' },
        { status: 404 }
      );
    }

    // Start a transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // Update report
      const updatedReport = await tx.report.update({
        where: { id: params.id },
        data: {
          status,
          resolution: resolution || null,
          resolvedAt: ['RESOLVED', 'DISMISSED'].includes(status) ? new Date() : null,
          resolvedBy: ['RESOLVED', 'DISMISSED'].includes(status) ? ctx.userId : null,
        }
      });

      // Execute all requested actions
      const actionsResults: any[] = [];
      const targetUserId = report.targetUserId;

      for (const action of userActions) {
        switch (action) {
          // ===== SUPPRESSION DE CONTENU =====
          case 'delete_evidence_photos':
            // Supprimer les photos signalées (dans evidenceUrls) si elles sont dans notre storage
            if (report.evidenceUrls && report.evidenceUrls.length > 0) {
              actionsResults.push({
                action: 'delete_evidence_photos',
                count: report.evidenceUrls.length,
                note: 'Photos marquees pour suppression (Stream Chat)'
              });
              // Log l'action
              await tx.adminLog.create({
                data: {
                  adminId: ctx.userId,
                  actionType: 'CONTENT_REMOVED',
                  targetUserId,
                  details: {
                    type: 'chat_photos',
                    urls: report.evidenceUrls,
                    reportId: params.id,
                  }
                }
              });
            }
            break;

          case 'delete_profile_photos':
            // Supprimer toutes les photos de profil de l'utilisateur
            const deletedPhotos = await tx.photo.deleteMany({
              where: { userId: targetUserId }
            });
            actionsResults.push({
              action: 'delete_profile_photos',
              count: deletedPhotos.count
            });
            await tx.adminLog.create({
              data: {
                adminId: ctx.userId,
                actionType: 'CONTENT_REMOVED',
                targetUserId,
                details: {
                  type: 'profile_photos',
                  count: deletedPhotos.count,
                  reportId: params.id,
                }
              }
            });
            break;

          // ===== AVERTISSEMENTS =====
          case 'warn':
            // Avertissement simple (juste log)
            actionsResults.push({ action: 'warn' });
            await tx.adminLog.create({
              data: {
                adminId: ctx.userId,
                actionType: 'USER_WARNED',
                targetUserId,
                details: {
                  reason: `Report: ${report.category}`,
                  reportId: params.id,
                }
              }
            });
            break;

          case 'warn_notify':
            // Avertissement avec notification
            await tx.notification.create({
              data: {
                userId: targetUserId,
                type: 'SYSTEM',
                title: 'Avertissement',
                message: `Votre compte a recu un avertissement suite a un signalement pour: ${getCategoryLabel(report.category)}. Veuillez respecter les regles de la communaute.`,
              }
            });
            actionsResults.push({ action: 'warn_notify' });
            await tx.adminLog.create({
              data: {
                adminId: ctx.userId,
                actionType: 'USER_WARNED',
                targetUserId,
                details: {
                  reason: `Report: ${report.category}`,
                  reportId: params.id,
                  notified: true,
                }
              }
            });
            break;

          // ===== SUSPENSIONS =====
          case 'suspend_1d':
          case 'suspend_3d':
          case 'suspend_7d':
          case 'suspend_30d':
            const durations: Record<string, number> = {
              'suspend_1d': 1,
              'suspend_3d': 3,
              'suspend_7d': 7,
              'suspend_30d': 30,
            };
            const days = durations[action];
            await tx.user.update({
              where: { id: targetUserId },
              data: {
                accountStatus: 'SUSPENDED',
                suspensionReason: `Signalement: ${report.category}`,
                suspendedAt: new Date(),
                suspendedUntil: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
              }
            });
            // Notifier l'utilisateur de sa suspension
            await tx.notification.create({
              data: {
                userId: targetUserId,
                type: 'SYSTEM',
                title: 'Compte suspendu',
                message: `Votre compte a ete suspendu pour ${days} jour(s) suite a un signalement pour: ${getCategoryLabel(report.category)}.`,
              }
            });
            actionsResults.push({ action: 'suspended', duration: `${days} days` });
            await tx.adminLog.create({
              data: {
                adminId: ctx.userId,
                actionType: 'USER_SUSPENDED',
                targetUserId,
                details: {
                  reason: `Report: ${report.category}`,
                  reportId: params.id,
                  duration: `${days} days`,
                }
              }
            });
            break;

          // ===== BANNISSEMENT =====
          case 'ban':
            if (!ctx.isAdmin) {
              throw new Error('Seuls les administrateurs peuvent bannir');
            }
            await tx.user.update({
              where: { id: targetUserId },
              data: {
                accountStatus: 'BANNED',
                suspensionReason: `Banni: ${report.category}`,
                suspendedAt: new Date(),
              }
            });
            // Notifier l'utilisateur de son bannissement
            await tx.notification.create({
              data: {
                userId: targetUserId,
                type: 'SYSTEM',
                title: 'Compte banni',
                message: `Votre compte a ete definitivement banni pour violation des regles de la communaute.`,
              }
            });
            actionsResults.push({ action: 'banned' });
            await tx.adminLog.create({
              data: {
                adminId: ctx.userId,
                actionType: 'USER_BANNED',
                targetUserId,
                details: {
                  reason: `Report: ${report.category}`,
                  reportId: params.id,
                }
              }
            });
            break;

          // ===== ACTIONS SUR LE SIGNALEUR (faux signalement) =====
          case 'warn_reporter':
            // Avertir le signaleur pour faux signalement
            await tx.notification.create({
              data: {
                userId: report.reporterId,
                type: 'SYSTEM',
                title: 'Avertissement',
                message: 'Votre signalement a ete juge abusif. Les faux signalements repetes peuvent entrainer une suspension de votre compte.',
              }
            });
            actionsResults.push({ action: 'warn_reporter' });
            await tx.adminLog.create({
              data: {
                adminId: ctx.userId,
                actionType: 'USER_WARNED',
                targetUserId: report.reporterId,
                details: {
                  reason: 'Faux signalement',
                  reportId: params.id,
                }
              }
            });
            break;
        }
      }

      return { updatedReport, actionsResults };
    });

    // Log the report resolution
    await logAdminAction(
      ctx.userId,
      status === 'RESOLVED' ? 'REPORT_RESOLVED' : 'REPORT_DISMISSED',
      report.targetUserId,
      {
        reportId: params.id,
        category: report.category,
        resolution,
        actions: result.actionsResults,
      },
      req
    );

    // Update pending reports count
    if (['RESOLVED', 'DISMISSED'].includes(status)) {
      await prisma.globalStats.upsert({
        where: { id: 'singleton' },
        update: {
          pendingReports: { decrement: 1 },
          lastCalculated: new Date(),
        },
        create: {
          id: 'singleton',
        }
      });
    }

    return NextResponse.json({
      success: true,
      report: result.updatedReport,
      actions: result.actionsResults,
      message: `Signalement ${status === 'RESOLVED' ? 'resolu' : status === 'DISMISSED' ? 'rejete' : 'mis a jour'}`,
    });

  } catch (error) {
    console.error('[ADMIN] Update report error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la mise a jour' },
      { status: 500 }
    );
  }
}

export const GET = withAdminAndParams<RouteParams>(handleGet);
export const PATCH = withAdminAndParams<RouteParams>(handlePatch);
