import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
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
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: 'URL de l\'image requise' }, { status: 400 });
    }

    // Vérifier le nombre de photos existantes
    const existingPhotos = await prisma.photo.count({
      where: { userId: user.id }
    });

    if (existingPhotos >= 6) {
      return NextResponse.json({ error: 'Maximum 6 photos autorisées' }, { status: 400 });
    }

    const photo = await prisma.photo.create({
      data: {
        userId: user.id,
        url: imageUrl,
        isPrimary: existingPhotos === 0
      }
    });

    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur lors de l\'ajout de la photo' }, { status: 500 });
  }
}