import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

  if (req.method === 'GET') {
    try {
      const userProfile = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          photos: {
            orderBy: { createdAt: 'asc' }
          },
          preferences: true
        },
        select: {
          id: true,
          name: true,
          email: true,
          age: true,
          bio: true,
          location: true,
          interests: true,
          image: true,
          photos: true,
          preferences: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return res.status(200).json(userProfile);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { name, age, bio, location, interests } = req.body;

      // Validation simple
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Le nom est requis' });
      }

      if (age && (age < 18 || age > 100)) {
        return res.status(400).json({ error: 'Âge doit être entre 18 et 100 ans' });
      }

      if (bio && bio.length > 500) {
        return res.status(400).json({ error: 'La bio ne peut pas dépasser 500 caractères' });
      }

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: name.trim(),
          age: age ? parseInt(age) : null,
          bio: bio ? bio.trim() : null,
          location: location ? location.trim() : null,
          interests: Array.isArray(interests) ? interests.filter((i: string) => i.trim().length > 0) : []
        },
        include: {
          photos: {
            orderBy: { createdAt: 'asc' }
          },
          preferences: true
        }
      });

      return res.status(200).json(updatedUser);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
    }
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
}
