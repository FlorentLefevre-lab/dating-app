// app/api/admin/email-marketing/segments/[id]/route.ts
// GET, PUT, DELETE for a single segment

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { validateSegmentConditions, countSegmentUsers } from '@/lib/email/segments';

// GET - Get a single segment with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || !['ADMIN', 'MODERATOR'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    const { id } = await params;

    const segment = await prisma.emailSegment.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            campaigns: true,
          },
        },
      },
    });

    if (!segment) {
      return NextResponse.json({ error: 'Segment non trouve' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      segment,
    });
  } catch (error) {
    console.error('Error fetching segment:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recuperation du segment' },
      { status: 500 }
    );
  }
}

// PUT - Update a segment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, conditions, isActive } = body;

    // Check segment exists
    const existingSegment = await prisma.emailSegment.findUnique({
      where: { id },
    });

    if (!existingSegment) {
      return NextResponse.json({ error: 'Segment non trouve' }, { status: 404 });
    }

    // Validate conditions if provided
    if (conditions) {
      const validation = validateSegmentConditions(conditions);
      if (!validation.valid) {
        return NextResponse.json(
          { error: 'Conditions invalides', details: validation.errors },
          { status: 400 }
        );
      }
    }

    // Check for duplicate name if changing
    if (name && name !== existingSegment.name) {
      const duplicateName = await prisma.emailSegment.findUnique({
        where: { name },
      });
      if (duplicateName) {
        return NextResponse.json(
          { error: 'Un segment avec ce nom existe deja' },
          { status: 400 }
        );
      }
    }

    // Update segment
    const segment = await prisma.emailSegment.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(conditions !== undefined && { conditions }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({
      success: true,
      segment,
    });
  } catch (error) {
    console.error('Error updating segment:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise a jour du segment' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a segment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    const { id } = await params;

    // Check segment exists
    const segment = await prisma.emailSegment.findUnique({
      where: { id },
      include: {
        _count: {
          select: { campaigns: true },
        },
      },
    });

    if (!segment) {
      return NextResponse.json({ error: 'Segment non trouve' }, { status: 404 });
    }

    // Check if segment is used by campaigns
    if (segment._count.campaigns > 0) {
      return NextResponse.json(
        { error: `Ce segment est utilise par ${segment._count.campaigns} campagne(s)` },
        { status: 400 }
      );
    }

    // Delete segment
    await prisma.emailSegment.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Segment supprime',
    });
  } catch (error) {
    console.error('Error deleting segment:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du segment' },
      { status: 500 }
    );
  }
}
