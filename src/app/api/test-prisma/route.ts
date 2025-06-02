// src/app/api/test-prisma/route.ts - NOUVEAU FICHIER pour tester Prisma
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🔍 TEST PRISMA: Début');
  
  try {
    console.log('🔍 TEST PRISMA: 1. Import du module db...');
    
    // Test d'import de Prisma
    let prisma: any = null;
    try {
      const dbModule = await import('@/lib/db');
      prisma = dbModule.prisma;
      console.log('✅ TEST PRISMA: Import réussi');
    } catch (importError: any) {
      console.error('❌ TEST PRISMA: Erreur import:', importError);
      return NextResponse.json({
        error: 'Erreur import Prisma',
        message: importError.message,
        path: '@/lib/db'
      }, { status: 500 });
    }
    
    if (!prisma) {
      console.error('❌ TEST PRISMA: prisma est null');
      return NextResponse.json({
        error: 'Prisma client non trouvé'
      }, { status: 500 });
    }
    
    console.log('🔍 TEST PRISMA: 2. Test connexion...');
    await prisma.$connect();
    console.log('✅ TEST PRISMA: Connexion OK');
    
    console.log('🔍 TEST PRISMA: 3. Test requête simple...');
    const userCount = await prisma.user.count();
    console.log('✅ TEST PRISMA: Requête OK, users:', userCount);
    
    await prisma.$disconnect();
    
    return NextResponse.json({
      status: 'Prisma OK',
      userCount: userCount,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ TEST PRISMA: Erreur:', error);
    return NextResponse.json({
      error: 'Erreur Prisma',
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}