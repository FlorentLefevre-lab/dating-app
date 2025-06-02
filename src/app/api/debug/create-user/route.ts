// src/app/api/debug/create-user/route.ts
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('👤 CRÉATION de l\'utilisateur manquant');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Session NextAuth invalide' }, { status: 401 });
    }

    const { prisma } = await import('@/lib/db');

    console.log('📋 Données session NextAuth:');
    console.log('  ID:', session.user.id);
    console.log('  Name:', session.user.name);
    console.log('  Email:', session.user.email);
    console.log('  Image:', session.user.image);

    // 1. Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true }
    });

    if (existingUser) {
      return NextResponse.json({
        message: 'Utilisateur existe déjà',
        user: existingUser,
        action: 'Aucune création nécessaire'
      });
    }

    // 2. Créer l'utilisateur avec les données de session
    console.log('🔄 Création utilisateur en BDD...');
    
    const newUser = await prisma.user.create({
      data: {
        id: session.user.id,
        name: session.user.name || 'Utilisateur',
        email: session.user.email || `user-${session.user.id}@example.com`,
        image: session.user.image || null,
        emailVerified: new Date() // Considérer comme vérifié puisque NextAuth l'a validé
      }
    });

    console.log('✅ Utilisateur créé:', newUser.id);

    // 3. Vérifier la création
    const verification = await prisma.user.findUnique({
      where: { id: newUser.id },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        image: true,
        createdAt: true 
      }
    });

    console.log('✅ Vérification:', verification);

    // 4. Maintenant créer des likes et matches avec ce nouvel utilisateur
    console.log('🔄 Création des likes et matches...');
    
    const fixLikesResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/debug/fix-likes`, {
      method: 'POST',
      headers: {
        'cookie': request.headers.get('cookie') || ''
      }
    });

    let fixResult = null;
    if (fixLikesResponse.ok) {
      fixResult = await fixLikesResponse.json();
      console.log('✅ Likes et matches créés automatiquement');
    } else {
      console.log('⚠️ Erreur création likes:', await fixLikesResponse.text());
    }

    return NextResponse.json({
      success: true,
      message: 'Utilisateur créé avec succès',
      user: verification,
      autoCreation: {
        likesAndMatches: fixResult?.success || false,
        details: fixResult
      },
      nextSteps: [
        'Rafraîchir votre page de chat',
        'Tester GET /api/debug/likes-matches pour vérifier',
        'Le chat devrait maintenant fonctionner !'
      ]
    });

  } catch (error: any) {
    console.error('❌ Erreur création utilisateur:', error);
    
    // Debug détaillé de l'erreur
    let errorDetails = {
      message: error.message,
      code: error.code || 'UNKNOWN'
    };

    if (error.code === 'P2002') {
      errorDetails = {
        ...errorDetails,
        reason: 'Contrainte unique violée (email ou autre champ)',
        suggestion: 'Vérifier si un utilisateur avec cet email existe déjà'
      };
    }

    return NextResponse.json({
      error: 'Erreur création utilisateur',
      details: errorDetails,
      sessionData: {
        hasSession: !!session,
        userId: session?.user?.id,
        userName: session?.user?.name,
        userEmail: session?.user?.email
      }
    }, { status: 500 });
  }
}

// GET pour diagnostiquer le problème
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    const diagnosis = {
      nextAuth: {
        hasSession: !!session,
        sessionValid: !!session?.user,
        sessionData: session?.user ? {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          hasImage: !!session.user.image
        } : null
      },
      database: {
        userExists: false,
        allUsersCount: 0
      }
    };

    if (session?.user?.id) {
      const { prisma } = await import('@/lib/db');
      
      const [userExists, totalUsers] = await Promise.all([
        prisma.user.findUnique({
          where: { id: session.user.id },
          select: { id: true, name: true, email: true }
        }),
        prisma.user.count()
      ]);

      diagnosis.database = {
        userExists: !!userExists,
        userData: userExists,
        allUsersCount: totalUsers
      };
    }

    diagnosis.recommendation = !diagnosis.database.userExists && diagnosis.nextAuth.hasSession
      ? 'POST /api/debug/create-user pour créer l\'utilisateur manquant'
      : diagnosis.database.userExists
        ? 'Utilisateur OK - problème ailleurs'
        : 'Problème d\'authentification NextAuth';

    return NextResponse.json(diagnosis);

  } catch (error: any) {
    return NextResponse.json({
      error: 'Erreur diagnostic',
      message: error.message
    }, { status: 500 });
  }
}