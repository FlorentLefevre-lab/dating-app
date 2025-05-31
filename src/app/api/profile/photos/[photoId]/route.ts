// app/api/profile/photos/[photoId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(
  request: NextRequest,
  { params }: { params: { photoId: string } }
) {
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
    const { photoId } = params;

    const photo = await prisma.photo.findFirst({
      where: {
        id: photoId,
        userId: user.id
      }
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo non trouvée' }, { status: 404 });
    }

    await prisma.photo.delete({
      where: { id: photoId }
    });

    // Si c'était la photo principale, définir une nouvelle photo principale
    if (photo.isPrimary) {
      const nextPhoto = await prisma.photo.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' }
      });

      if (nextPhoto) {
        await prisma.photo.update({
          where: { id: nextPhoto.id },
          data: { isPrimary: true }
        });
      }
    }

    return NextResponse.json({ message: 'Photo supprimée avec succès' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { photoId: string } }
) {
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
    const { photoId } = params;

    const photo = await prisma.photo.findFirst({
      where: {
        id: photoId,
        userId: user.id
      }
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo non trouvée' }, { status: 404 });
    }

    // Transaction pour mettre à jour les photos
    await prisma.$transaction([
      // Retirer le statut principal de toutes les photos
      prisma.photo.updateMany({
        where: { userId: user.id },
        data: { isPrimary: false }
      }),
      // Définir la nouvelle photo principale
      prisma.photo.update({
        where: { id: photoId },
        data: { isPrimary: true }
      })
    ]);

    return NextResponse.json({ message: 'Photo principale mise à jour' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
  }
}