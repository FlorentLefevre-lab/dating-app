// app/api/admin/email-marketing/campaigns/[id]/cancel/route.ts
// POST - Cancel a campaign

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { cancelCampaign } from '@/lib/email/queue';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    const { id } = await params;

    // Get campaign
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campagne non trouvee' }, { status: 404 });
    }

    // Can only cancel SENDING, PAUSED, or SCHEDULED campaigns
    if (!['SENDING', 'PAUSED', 'SCHEDULED'].includes(campaign.status)) {
      return NextResponse.json(
        { error: 'Cette campagne ne peut pas etre annulee' },
        { status: 400 }
      );
    }

    // Cancel in queue (removes pending sends)
    await cancelCampaign(id);

    // Update pending sends to FAILED
    await prisma.emailSend.updateMany({
      where: {
        campaignId: id,
        status: { in: ['PENDING', 'QUEUED'] },
      },
      data: {
        status: 'FAILED',
        lastError: 'Campagne annulee',
      },
    });

    // Update campaign status
    await prisma.emailCampaign.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Campagne annulee',
    });
  } catch (error) {
    console.error('Error cancelling campaign:', error);
    return NextResponse.json(
      { error: "Erreur lors de l'annulation de la campagne" },
      { status: 500 }
    );
  }
}
