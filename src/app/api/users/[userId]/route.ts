// src/app/api/users/[userId]/route.ts - API pour récupérer un utilisateur spécifique
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  console.log('🔍 API Users - Récupération utilisateur:', params.userId);
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { userId } = params;
    
    if (!userId) {
      return NextResponse.json({ error: 'ID utilisateur requis' }, { status: 400 });
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: userId },
          { email: userId } // Au cas où on passe un email au lieu d'un ID
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        age: true,
        bio: true,
        location: true,
        profession: true,
        gender: true,
        preferences: true,
        photos: {
          select: {
            url: true,
            isPrimary: true
          },
          orderBy: { isPrimary: 'desc' }
        }
      }
    });

    if (!user) {
      console.log('❌ Utilisateur non trouvé:', userId);
      return NextResponse.json({ 
        error: 'Utilisateur non trouvé',
        userId: userId 
      }, { status: 404 });
    }

    console.log('✅ Utilisateur trouvé:', user.id, user.name);

    // Vérifier si on peut voir cet utilisateur (privacy settings)
    // Ici vous pourriez ajouter des règles de confidentialité

    // Formater les photos
    const formattedUser = {
      ...user,
      image: user.photos.find(p => p.isPrimary)?.url || user.photos[0]?.url || user.image,
      photos: undefined // Retirer le tableau photos du résultat final
    };

    return NextResponse.json({
      success: true,
      user: formattedUser
    });

  } catch (error: any) {
    console.error('❌ Erreur API users:', error);
    return NextResponse.json({
      error: 'Erreur serveur',
      message: error.message
    }, { status: 500 });
  }
}