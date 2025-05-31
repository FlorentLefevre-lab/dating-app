import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

// Singleton pour Prisma (évite les multiples connexions)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// POST - Ajouter une photo
export async function POST(request: NextRequest) {
  try {
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
    const { imageUrl } = body;

    // Debug logs
    console.log('Body reçu:', body);
    console.log('ImageUrl:', imageUrl);

    if (!imageUrl) {
      console.log('Erreur: URL de l\'image manquante');
      return NextResponse.json({ error: 'URL de l\'image requise' }, { status: 400 });
    }

    // Vérifier le nombre de photos existantes
    const existingPhotos = await prisma.photo.count({
      where: { userId: user.id }
    });

    console.log('Nombre de photos existantes:', existingPhotos);

    if (existingPhotos >= 6) {
      console.log('Erreur: Maximum 6 photos atteint');
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
    console.error('Erreur POST photos:', error);
    return NextResponse.json({ error: 'Erreur lors de l\'ajout de la photo' }, { status: 500 });
  }
}

// GET - Récupérer les photos de l'utilisateur
export async function GET(request: NextRequest) {
  try {
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

    const photos = await prisma.photo.findMany({
      where: { userId: user.id },
      orderBy: [
        { isPrimary: 'desc' }, // Photo principale en premier
        { createdAt: 'asc' }   // Puis par ordre de création
      ]
    });

    return NextResponse.json({ photos }, { status: 200 });
    
  } catch (error) {
    console.error('Erreur GET photos:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des photos' }, { status: 500 });
  }
}

// DELETE - Supprimer une photo
export async function DELETE(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('id');

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
    console.error('Erreur DELETE photos:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression de la photo' }, { status: 500 });
  }
}

// PUT - Mettre à jour une photo (ex: changer la photo principale)
export async function PUT(request: NextRequest) {
  try {
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
    const { photoId, action } = body;

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
    console.error('Erreur PUT photos:', error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour de la photo' }, { status: 500 });
  }
}