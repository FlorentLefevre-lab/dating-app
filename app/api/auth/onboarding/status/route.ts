// app/api/auth/onboarding/status/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Vérifier si l'onboarding est complété
export async function GET() {
  try {
    // Vérifier l'authentification
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Récupérer uniquement le champ onboardingCompletedAt
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        onboardingCompletedAt: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // L'onboarding est complété si onboardingCompletedAt est défini
    const completed = !!user.onboardingCompletedAt;

    return NextResponse.json({
      completed,
      completedAt: user.onboardingCompletedAt
    });

  } catch (error) {
    console.error('💥 Erreur vérification onboarding:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification' },
      { status: 500 }
    );
  }
}
