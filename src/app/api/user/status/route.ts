// src/app/api/user/status/route.ts
import { auth } from '../../../../auth'
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Récupérer le statut d'un ou plusieurs utilisateurs
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const userIds = searchParams.get('userIds'); // IDs séparés par des virgules

    if (!userId && !userIds) {
      return NextResponse.json({ 
        error: 'Paramètre userId ou userIds requis' 
      }, { status: 400 });
    }

    if (userId) {
      // Statut d'un utilisateur unique
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          isOnline: true,
          lastSeen: true
        }
      });

      if (!user) {
        return NextResponse.json({ 
          error: 'Utilisateur introuvable' 
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        status: {
          userId: user.id,
          name: user.name,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen?.toISOString(),
          status: user.isOnline ? 'online' : 'offline'
        }
      });

    } else if (userIds) {
      // Statuts de plusieurs utilisateurs
      const userIdList = userIds.split(',').filter(id => id.trim());
      
      const users = await prisma.user.findMany({
        where: {
          id: { in: userIdList }
        },
        select: {
          id: true,
          name: true,
          isOnline: true,
          lastSeen: true
        }
      });

      const statuses = users.map(user => ({
        userId: user.id,
        name: user.name,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen?.toISOString(),
        status: user.isOnline ? 'online' : 'offline'
      }));

      return NextResponse.json({
        success: true,
        statuses
      });
    }

  } catch (error: any) {
    console.error('❌ Erreur API statut utilisateur:', error);
    return NextResponse.json({
      error: 'Erreur serveur',
      message: error.message
    }, { status: 500 });
  }
}

// POST - Mettre à jour le statut de l'utilisateur actuel
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { status, isOnline } = body;

    // Valider les paramètres
    if (typeof isOnline !== 'boolean') {
      return NextResponse.json({ 
        error: 'Paramètre isOnline requis (boolean)' 
      }, { status: 400 });
    }

    const validStatuses = ['online', 'away', 'busy', 'offline'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ 
        error: `Statut invalide. Valeurs autorisées: ${validStatuses.join(', ')}` 
      }, { status: 400 });
    }

    // Récupérer l'utilisateur actuel
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true }
    });

    if (!currentUser) {
      return NextResponse.json({ 
        error: 'Utilisateur introuvable' 
      }, { status: 404 });
    }

    // Mettre à jour le statut
    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        isOnline,
        lastSeen: new Date()
      },
      select: {
        id: true,
        name: true,
        isOnline: true,
        lastSeen: true
      }
    });

    console.log('✅ Statut utilisateur mis à jour:', {
      userId: updatedUser.id,
      isOnline: updatedUser.isOnline,
      status
    });

    return NextResponse.json({
      success: true,
      status: {
        userId: updatedUser.id,
        name: updatedUser.name,
        isOnline: updatedUser.isOnline,
        lastSeen: updatedUser.lastSeen?.toISOString(),
        status: status || (updatedUser.isOnline ? 'online' : 'offline')
      }
    });

  } catch (error: any) {
    console.error('❌ Erreur mise à jour statut:', error);
    return NextResponse.json({
      error: 'Erreur serveur',
      message: error.message
    }, { status: 500 });
  }
}

// PATCH - Heartbeat pour maintenir le statut en ligne
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer l'utilisateur actuel
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!currentUser) {
      return NextResponse.json({ 
        error: 'Utilisateur introuvable' 
      }, { status: 404 });
    }

    // Mettre à jour lastSeen et s'assurer qu'il est en ligne
    await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        isOnline: true,
        lastSeen: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Heartbeat enregistré',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Erreur heartbeat:', error);
    return NextResponse.json({
      error: 'Erreur serveur',
      message: error.message
    }, { status: 500 });
  }
}

// DELETE - Marquer l'utilisateur comme hors ligne
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer l'utilisateur actuel
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!currentUser) {
      return NextResponse.json({ 
        error: 'Utilisateur introuvable' 
      }, { status: 404 });
    }

    // Marquer comme hors ligne
    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        isOnline: false,
        lastSeen: new Date()
      },
      select: {
        id: true,
        name: true,
        isOnline: true,
        lastSeen: true
      }
    });

    console.log('✅ Utilisateur marqué hors ligne:', {
      userId: updatedUser.id,
      lastSeen: updatedUser.lastSeen
    });

    return NextResponse.json({
      success: true,
      status: {
        userId: updatedUser.id,
        name: updatedUser.name,
        isOnline: updatedUser.isOnline,
        lastSeen: updatedUser.lastSeen?.toISOString(),
        status: 'offline'
      }
    });

  } catch (error: any) {
    console.error('❌ Erreur mise hors ligne:', error);
    return NextResponse.json({
      error: 'Erreur serveur',
      message: error.message
    }, { status: 500 });
  }
}