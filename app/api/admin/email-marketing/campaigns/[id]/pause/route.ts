// app/api/admin/email-marketing/campaigns/[id]/pause/route.ts
// POST - Pause a sending campaign

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { pauseCampaign } from '@/lib/email/queue';

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

    // Can only pause SENDING campaigns
    if (campaign.status !== 'SENDING') {
      return NextResponse.json(
        { error: 'Seules les campagnes en cours peuvent etre mises en pause' },
        { status: 400 }
      );
    }

    // Pause in queue
    await pauseCampaign(id);

    // Update campaign status
    await prisma.emailCampaign.update({
      where: { id },
      data: { status: 'PAUSED' },
    });

    return NextResponse.json({
      success: true,
      message: 'Campagne mise en pause',
    });
  } catch (error) {
    console.error('Error pausing campaign:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise en pause de la campagne' },
      { status: 500 }
    );
  }
}
