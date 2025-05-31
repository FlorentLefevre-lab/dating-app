import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!user) {
    return res.status(404).json({ error: 'Utilisateur non trouvé' });
  }

  try {
    const { minAge, maxAge, maxDistance, gender } = req.body;

    // Validation
    if (minAge && (minAge < 18 || minAge > 99)) {
      return res.status(400).json({ error: 'Âge minimum doit être entre 18 et 99' });
    }

    if (maxAge && (maxAge < 18 || maxAge > 99)) {
      return res.status(400).json({ error: 'Âge maximum doit être entre 18 et 99' });
    }

    if (minAge && maxAge && minAge > maxAge) {
      return res.status(400).json({ error: 'Âge minimum ne peut pas être supérieur à l\'âge maximum' });
    }

    if (maxDistance && (maxDistance < 1 || maxDistance > 500)) {
      return res.status(400).json({ error: 'Distance doit être entre 1 et 500 km' });
    }

    const preferences = await prisma.userPreferences.upsert({
      where: { userId: user.id },
      update: {
        minAge: minAge ? parseInt(minAge) : undefined,
        maxAge: maxAge ? parseInt(maxAge) : undefined,
        maxDistance: maxDistance ? parseInt(maxDistance) : undefined,
        gender: gender || null
      },
      create: {
        userId: user.id,
        minAge: parseInt(minAge) || 18,
        maxAge: parseInt(maxAge) || 100,
        maxDistance: parseInt(maxDistance) || 50,
        gender: gender || null
      }
    });

    return res.status(200).json(preferences);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erreur lors de la sauvegarde des préférences' });
  }
}