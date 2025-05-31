import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

// Singleton pour Prisma
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// DELETE - Supprimer une photo spécifique
export async function DELETE(
  request: NextRequest, 
  { params }: { params: Promise<{ photoId: string }> } // ✅ Typé comme Promise
) {
  try {
    // ✅ Await params avant utilisation (Next.js 15)
    const { photoId } = await params;
    
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

    if (!photoId) {
      return NextResponse.json({ error: 'ID de la photo requis' }, { status: 400 });
    }

    // Vérifier que la photo appartient à l'utilisateur
    const photo = await prisma.photo.findFirst({
      where: { 
        id: photoId,
        userId: user.id 
      }
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo non trouvée' }, { status: 404 });
    }

    // Si c'est la photo principale, définir une autre comme principale
    if (photo.isPrimary) {
      const nextPhoto = await prisma.photo.findFirst({
        where: { 
          userId: user.id,
          id: { not: photoId }
        },
        orderBy: { createdAt: 'asc' }
      });

      if (nextPhoto) {
        await prisma.photo.update({
          where: { id: nextPhoto.id },
          data: { isPrimary: true }
        });
      }
    }

    await prisma.photo.delete({
      where: { id: photoId }
    });

    return NextResponse.json({ success: true }, { status: 200 });
    
  } catch (error) {
    console.error('Erreur DELETE photo:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression de la photo' }, { status: 500 });
  }
}

// PUT - Mettre à jour une photo spécifique (ex: changer en photo principale)
export async function PUT(
  request: NextRequest, 
  { params }: { params: Promise<{ photoId: string }> } // ✅ Typé comme Promise
) {
  try {
    // ✅ Await params avant utilisation (Next.js 15)
    const { photoId } = await params;
    
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

    const body = await request.json();
    const { action } = body;

    if (!photoId || !action) {
      return NextResponse.json({ error: 'ID de la photo et action requis' }, { status: 400 });
    }

    // Vérifier que la photo appartient à l'utilisateur
    const photo = await prisma.photo.findFirst({
      where: { 
        id: photoId,
        userId: user.id 
      }
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo non trouvée' }, { status: 404 });
    }

    if (action === 'setPrimary') {
      // Retirer le statut principal de toutes les autres photos
      await prisma.photo.updateMany({
        where: { 
          userId: user.id,
          id: { not: photoId }
        },
        data: { isPrimary: false }
      });

      // Définir cette photo comme principale
      const updatedPhoto = await prisma.photo.update({
        where: { id: photoId },
        data: { isPrimary: true }
      });

      return NextResponse.json(updatedPhoto, { status: 200 });
    }

    return NextResponse.json({ error: 'Action non supportée' }, { status: 400 });
    
  } catch (error) {
    console.error('Erreur PUT photo:', error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour de la photo' }, { status: 500 });
  }
}

// GET - Récupérer une photo spécifique
export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ photoId: string }> } // ✅ Typé comme Promise
) {
  try {
    // ✅ Await params avant utilisation (Next.js 15)
    const { photoId } = await params;
    
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

    if (!photoId) {
      return NextResponse.json({ error: 'ID de la photo requis' }, { status: 400 });
    }

    // Récupérer la photo spécifique
    const photo = await prisma.photo.findFirst({
      where: { 
        id: photoId,
        userId: user.id 
      }
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo non trouvée' }, { status: 404 });
    }

    return NextResponse.json(photo, { status: 200 });
    
  } catch (error) {
    console.error('Erreur GET photo:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération de la photo' }, { status: 500 });
  }
}