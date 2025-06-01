// src/app/api/discover/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Récupérer la session sans authOptions
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Trouver l'utilisateur par email au lieu de l'ID
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { preferences: true }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const userId = currentUser.id;
    const { searchParams } = new URL(request.url);
    const reset = searchParams.get('reset') === 'true';

    console.log('🔍 API GET /discover - Début');
    console.log('👤 Utilisateur actuel:', currentUser.name, '(', userId, ')');

    // Récupérer les préférences
    const userPreferences = currentUser.preferences;

    if (!userPreferences) {
      // Créer des préférences par défaut si elles n'existent pas
      const defaultPrefs = await prisma.userPreferences.create({
        data: {
          userId: userId,
          minAge: 18,
          maxAge: 35,
          maxDistance: 100,
          gender: 'tous',
          lookingFor: 'relation-casual'
        }
      });
      console.log('✅ Préférences par défaut créées');
    }

    // Reset COMPLET si demandé
    if (reset) {
      console.log('🔄 Reset COMPLET demandé...');
      
      // Supprimer toutes les interactions de l'utilisateur
      await Promise.all([
        prisma.profileView.deleteMany({
          where: { viewerId: userId }
        }),
        prisma.like.deleteMany({
          where: { senderId: userId }
        }),
        prisma.dislike.deleteMany({
          where: { senderId: userId }
        })
      ]);

      // Vérifier que le reset a fonctionné
      const [remainingViews, remainingLikes, remainingDislikes] = await Promise.all([
        prisma.profileView.count({ where: { viewerId: userId } }),
        prisma.like.count({ where: { senderId: userId } }),
        prisma.dislike.count({ where: { senderId: userId } })
      ]);

      console.log('🔍 Après reset complet:');
      console.log('  - Vues restantes:', remainingViews);
      console.log('  - Likes restants:', remainingLikes);
      console.log('  - Dislikes restants:', remainingDislikes);
      console.log('✅ Reset complet terminé');
    }

    // Récupérer les IDs exclus (après le reset éventuel)
    const [viewedProfiles, likedProfiles, dislikedProfiles] = await Promise.all([
      prisma.profileView.findMany({
        where: { viewerId: userId },
        select: { viewedId: true }
      }),
      prisma.like.findMany({
        where: { senderId: userId },
        select: { receiverId: true }
      }),
      prisma.dislike.findMany({
        where: { senderId: userId },
        select: { receiverId: true }
      })
    ]);

    const excludedIds = [
      userId,
      ...viewedProfiles.map(v => v.viewedId),
      ...likedProfiles.map(l => l.receiverId),
      ...dislikedProfiles.map(d => d.receiverId)
    ];

    console.log('🚫 IDs exclus:', excludedIds.length, 'profils');
    if (excludedIds.length <= 5) {
      console.log('🔍 IDs exclus détail:', excludedIds);
    }

    // Construire les filtres
    const prefs = userPreferences || { minAge: 18, maxAge: 35, gender: 'tous' };
    
    const filters: any = {
      id: { notIn: excludedIds },
      age: {
        gte: Math.max(prefs.minAge - 5, 18),
        lte: prefs.maxAge + 5
      }
    };

    // Filtrer par genre si spécifié
    if (prefs.gender && prefs.gender !== 'tous') {
      const genderMap: any = {
        'homme': 'HOMME',
        'femme': 'FEMME', 
        'non-binaire': 'NON_BINAIRE'
      };
      filters.gender = genderMap[prefs.gender.toLowerCase()] || prefs.gender.toUpperCase();
    }

    console.log('🔍 Filtres appliqués:', filters);

    // Récupérer les candidats
    const candidates = await prisma.user.findMany({
      where: filters,
      include: {
        photos: { 
          orderBy: { isPrimary: 'desc' }, 
          take: 5 
        },
        preferences: true
      },
      take: 50
    });

    console.log('👥 Candidats trouvés:', candidates.length);

    // Si aucun candidat et pas de reset, suggérer un reset
    if (candidates.length === 0 && !reset) {
      return NextResponse.json({
        profiles: [],
        message: 'Plus de nouveaux profils ! Utilisez le bouton "Réinitialiser" pour revoir des profils.',
        hasMore: false,
        suggestReset: true
      });
    }

    // Si aucun candidat même après reset
    if (candidates.length === 0 && reset) {
      return NextResponse.json({
        profiles: [],
        message: 'Aucun profil disponible dans vos critères. Essayez d\'élargir votre zone de recherche.',
        hasMore: false,
        suggestReset: false
      });
    }

    // Calculer des scores de compatibilité simples
    const scoredProfiles = candidates.map(candidate => {
      let score = 50; // Score de base

      // Bonus pour les intérêts communs
      if (currentUser.interests && candidate.interests) {
        const commonInterests = currentUser.interests.filter(interest => 
          candidate.interests.includes(interest)
        );
        score += commonInterests.length * 10;
      }

      // Bonus pour la proximité géographique
      if (currentUser.region === candidate.region) score += 15;
      if (currentUser.department === candidate.department) score += 10;

      // Bonus pour un profil complet
      if (candidate.bio && candidate.bio.length > 50) score += 5;
      if (candidate.photos && candidate.photos.length > 0) score += 10;

      return {
        ...candidate,
        compatibilityScore: Math.min(100, score),
        distance: calculateDistance(currentUser, candidate)
      };
    });

    const topProfiles = scoredProfiles
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, 10);

    console.log('✅ Profils recommandés:', topProfiles.length);
    console.log('📊 Scores:', topProfiles.map(p => 
      `${p.name}: ${p.compatibilityScore}%`
    ));

    return NextResponse.json({
      profiles: topProfiles,
      hasMore: candidates.length > 10,
      totalCandidates: candidates.length,
      message: `${topProfiles.length} profil${topProfiles.length > 1 ? 's' : ''} trouvé${topProfiles.length > 1 ? 's' : ''} !`
    });

  } catch (error) {
    console.error('❌ Erreur /api/discover:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur interne',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

// Fonction helper pour calculer la distance approximative
function calculateDistance(user1: any, user2: any): number | null {
  if (!user1?.location || !user2?.location) return null;
  
  // Si même ville
  if (user1.location === user2.location) return 0;
  
  // Si même code postal
  if (user1.postcode === user2.postcode) return Math.floor(Math.random() * 5);
  
  // Si même département
  if (user1.department === user2.department) return Math.floor(Math.random() * 30) + 5;
  
  // Si même région
  if (user1.region === user2.region) return Math.floor(Math.random() * 80) + 30;
  
  // Autre région
  return Math.floor(Math.random() * 300) + 100;
}