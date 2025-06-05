import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../auth'
const session = await auth()
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function PUT(request: NextRequest) {
  try {
    console.log('🔥 API user-preferences PUT appelée');
    
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
    console.log('🔥 Body préférences reçu:', body);

    const { minAge, maxAge, maxDistance, gender, lookingFor } = body;

    // Validation des champs requis
    if (!minAge || !maxAge || !maxDistance) {
      return NextResponse.json({
        error: 'Les âges minimum, maximum et la distance sont requis'
      }, { status: 400 });
    }

    if (minAge > maxAge) {
      return NextResponse.json({
        error: 'L\'âge minimum ne peut pas être supérieur à l\'âge maximum'
      }, { status: 400 });
    }

    console.log('✅ Validation préférences OK');

    // Préparer les données à sauvegarder
    const preferencesData = {
      minAge: parseInt(minAge),
      maxAge: parseInt(maxAge),
      maxDistance: parseInt(maxDistance),
      gender: gender || null,
      lookingFor: lookingFor || null
    };

    console.log('📝 Données à sauvegarder:', preferencesData);

    // Vérifier si des préférences existent déjà pour cet utilisateur
    const existingPreferences = await prisma.userPreferences.findUnique({
      where: { userId: user.id }
    });

    let savedPreferences;

    if (existingPreferences) {
      console.log('🔄 Mise à jour des préférences existantes');
      // Mettre à jour les préférences existantes
      savedPreferences = await prisma.userPreferences.update({
        where: { userId: user.id },
        data: preferencesData
      });
    } else {
      console.log('✨ Création de nouvelles préférences');
      // Créer de nouvelles préférences
      savedPreferences = await prisma.userPreferences.create({
        data: {
          userId: user.id,
          ...preferencesData
        }
      });
    }

    console.log('✅ Préférences sauvegardées en base:', savedPreferences);

    // Retourner les préférences sauvegardées
    const responseData = {
      id: savedPreferences.id,
      minAge: savedPreferences.minAge,
      maxAge: savedPreferences.maxAge,
      maxDistance: savedPreferences.maxDistance,
      gender: savedPreferences.gender,
      lookingFor: savedPreferences.lookingFor
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ Erreur PUT user-preferences:', error);
    return NextResponse.json({
      error: 'Erreur lors de la mise à jour des préférences'
    }, { status: 500 });
  }
}

// Optionnel : Ajout d'un GET pour récupérer les préférences
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API user-preferences GET appelée');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        preferences: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    console.log('✅ Préférences récupérées:', user.preferences);

    // Retourner les préférences ou des valeurs par défaut
    const preferences = user.preferences || {
      minAge: 18,
      maxAge: 35,
      maxDistance: 50,
      gender: null,
      lookingFor: null
    };

    return NextResponse.json(preferences);

  } catch (error) {
    console.error('❌ Erreur GET user-preferences:', error);
    return NextResponse.json({
      error: 'Erreur lors de la récupération des préférences'
    }, { status: 500 });
  }
}