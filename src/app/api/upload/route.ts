// src/app/api/upload/route.ts - Format App Router Next.js 13+
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// ✅ EXPORT NOMMÉ pour POST (pas de default export)
export async function POST(request: NextRequest) {
  console.log('📎 API Upload POST appelée');
  
  try {
    // Vérification de l'authentification
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log('❌ Upload: Utilisateur non authentifié');
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    console.log('✅ Upload: Utilisateur authentifié:', session.user.id);

    // Récupération des fichiers
    const formData = await request.formData();
    const files: File[] = [];
    
    // Collecter tous les fichiers du FormData
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file-') && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 });
    }

    console.log(`📎 ${files.length} fichier(s) à traiter`);

    // Créer le dossier uploads s'il n'existe pas
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', new Date().getFullYear().toString());
    await mkdir(uploadDir, { recursive: true });

    const uploadedFiles = [];

    for (const file of files) {
      // Vérification de la taille (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ 
          error: `Fichier trop volumineux: ${file.name} (max 10MB)` 
        }, { status: 400 });
      }

      // Générer un nom unique
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const extension = path.extname(file.name);
      const filename = `${timestamp}-${randomString}${extension}`;
      const filepath = path.join(uploadDir, filename);

      // Sauvegarder le fichier
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filepath, buffer);

      // URL publique
      const publicUrl = `/uploads/${new Date().getFullYear()}/${filename}`;

      const uploadedFile = {
        id: `${timestamp}-${randomString}`,
        name: file.name,
        type: file.type,
        size: file.size,
        url: publicUrl,
        thumbnailUrl: file.type.startsWith('image/') ? publicUrl : undefined
      };

      uploadedFiles.push(uploadedFile);
      console.log('✅ Fichier uploadé:', filename);
    }

    return NextResponse.json({ 
      files: uploadedFiles,
      message: `${uploadedFiles.length} fichier(s) uploadé(s) avec succès`
    });

  } catch (error) {
    console.error('❌ Erreur API upload:', error);
    return NextResponse.json({ 
      error: 'Erreur lors de l\'upload' 
    }, { status: 500 });
  }
}