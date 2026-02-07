// app/api/admin/email-marketing/campaigns/[id]/resume/route.ts
// POST - Resume a paused campaign

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { resumeCampaign } from '@/lib/email/queue';

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

    // Can only resume PAUSED campaigns
    if (campaign.status !== 'PAUSED') {
      return NextResponse.json(
        { error: 'Seules les campagnes en pause peuvent etre reprises' },
        { status: 400 }
      );
    }

    // Resume in queue
    await resumeCampaign(id);

    // Update campaign status
    await prisma.emailCampaign.update({
      where: { id },
      data: { status: 'SENDING' },
    });

    return NextResponse.json({
      success: true,
      message: 'Campagne reprise',
    });
  } catch (error) {
    console.error('Error resuming campaign:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la reprise de la campagne' },
      { status: 500 }
    );
  }
}
