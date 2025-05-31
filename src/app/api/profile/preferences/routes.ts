import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!user) {
    return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { minAge, maxAge, maxDistance, gender } = body;

    // Validation
    if (minAge && (minAge < 18 || minAge > 99)) {
      return NextResponse.json({ error: 'Âge minimum doit être entre 18 et 99' }, { status: 400 });
    }

    if (maxAge && (maxAge < 18 || maxAge > 99)) {
      return NextResponse.json({ error: 'Âge maximum doit être entre 18 et 99' }, { status: 400 });
    }

    if (minAge && maxAge && minAge > maxAge) {
      return NextResponse.json({ error: 'Âge minimum ne peut pas être supérieur à l\'âge maximum' }, { status: 400 });
    }

    if (maxDistance && (maxDistance < 1 || maxDistance > 500)) {
      return NextResponse.json({ error: 'Distance doit être entre 1 et 500 km' }, { status: 400 });
    }

    const preferences = await prisma.userPreferences.upsert({
      where: { userId: user.id },
      update: {
        minAge: minAge ? parseInt(minAge) : undefined,
        maxAge: maxAge ? parseInt(maxAge) : undefined,
        maxDistance: maxDistance ? parseInt(maxDistance) : undefined,
        gender: gender || null
      },
      create: {
        userId: user.id,
        minAge: parseInt(minAge) || 18,
        maxAge: parseInt(maxAge) || 100,
        maxDistance: parseInt(maxDistance) || 50,
        gender: gender || null
      }
    });

    return NextResponse.json(preferences);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur lors de la sauvegarde des préférences' }, { status: 500 });
  }
}
