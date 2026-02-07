// app/api/admin/email-marketing/segments/[id]/count/route.ts
// POST - Recalculate segment user count

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { countSegmentUsers } from '@/lib/email/segments';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || !['ADMIN', 'MODERATOR'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    const { id } = await params;

    // Get segment
    const segment = await prisma.emailSegment.findUnique({
      where: { id },
    });

    if (!segment) {
      return NextResponse.json({ error: 'Segment non trouve' }, { status: 404 });
    }

    // Count users matching segment conditions
    const count = await countSegmentUsers(segment.conditions as any);

    // Update cached count
    const updatedSegment = await prisma.emailSegment.update({
      where: { id },
      data: {
        cachedCount: count,
        lastCountAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      count,
      lastCountAt: updatedSegment.lastCountAt,
    });
  } catch (error) {
    console.error('Error counting segment:', error);
    return NextResponse.json(
      { error: 'Erreur lors du comptage du segment' },
      { status: 500 }
    );
  }
}
