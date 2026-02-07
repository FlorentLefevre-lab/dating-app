// app/api/admin/email-marketing/segments/preview/route.ts
// POST - Preview segment users and count

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { validateSegmentConditions, countSegmentUsers, previewSegmentUsers } from '@/lib/email/segments';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || !['ADMIN', 'MODERATOR'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    const body = await request.json();
    const { conditions, limit = 10 } = body;

    if (!conditions) {
      return NextResponse.json(
        { error: 'Conditions requises' },
        { status: 400 }
      );
    }

    // Validate conditions structure
    const validation = validateSegmentConditions(conditions);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Conditions invalides', details: validation.errors },
        { status: 400 }
      );
    }

    // Get count and sample users
    const [count, users] = await Promise.all([
      countSegmentUsers(conditions),
      previewSegmentUsers(conditions, limit),
    ]);

    return NextResponse.json({
      success: true,
      count,
      users,
    });
  } catch (error) {
    console.error('Error previewing segment:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la previsualisation du segment' },
      { status: 500 }
    );
  }
}
