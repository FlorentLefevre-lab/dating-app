// scripts/add-matches-florent.js
require('dotenv').config({ path: '.env.local' });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const targetEmail = 'florent.lefevre3@free.fr';

  console.log('🔍 Recherche de l\'utilisateur:', targetEmail);

  // Trouver l'utilisateur cible
  const targetUser = await prisma.user.findUnique({
    where: { email: targetEmail },
    select: { id: true, name: true, email: true, gender: true }
  });

  if (!targetUser) {
    console.error('❌ Utilisateur non trouvé:', targetEmail);
    process.exit(1);
  }

  console.log('✅ Utilisateur trouvé:', targetUser.name, '(', targetUser.id, ')');

  // Trouver des femmes actives
  console.log('\n🔍 Recherche de profils féminins...');

  const women = await prisma.user.findMany({
    where: {
      gender: 'FEMALE',
      id: { not: targetUser.id },
      accountStatus: 'ACTIVE'
    },
    select: { id: true, name: true, email: true },
    take: 10
  });

  console.log(`✅ ${women.length} femmes trouvées`);

  if (women.length === 0) {
    console.log('❌ Aucune femme trouvée dans la base');
    process.exit(1);
  }

  // Créer des likes mutuels et des matchs
  console.log('\n💕 Création des matchs...');

  let matchCount = 0;

  for (const woman of women) {
    try {
      // Vérifier si un match existe déjà
      const existingMatch = await prisma.match.findFirst({
        where: {
          OR: [
            { user1Id: targetUser.id, user2Id: woman.id },
            { user1Id: woman.id, user2Id: targetUser.id }
          ]
        }
      });

      if (existingMatch) {
        console.log(`  ⏭️  Match existe déjà avec ${woman.name}`);
        continue;
      }

      // Créer le like de l'utilisateur vers la femme (s'il n'existe pas)
      await prisma.like.upsert({
        where: {
          senderId_receiverId: {
            senderId: targetUser.id,
            receiverId: woman.id
          }
        },
        create: {
          senderId: targetUser.id,
          receiverId: woman.id
        },
        update: {}
      });

      // Créer le like de la femme vers l'utilisateur (s'il n'existe pas)
      await prisma.like.upsert({
        where: {
          senderId_receiverId: {
            senderId: woman.id,
            receiverId: targetUser.id
          }
        },
        create: {
          senderId: woman.id,
          receiverId: targetUser.id
        },
        update: {}
      });

      // Créer le match
      await prisma.match.create({
        data: {
          user1Id: targetUser.id,
          user2Id: woman.id
        }
      });

      console.log(`  ✅ Match créé avec ${woman.name}`);
      matchCount++;

    } catch (error) {
      console.error(`  ❌ Erreur avec ${woman.name}:`, error.message);
    }
  }

  console.log(`\n🎉 ${matchCount} nouveaux matchs créés pour ${targetUser.name}!`);

  // Afficher le total des matchs
  const totalMatches = await prisma.match.count({
    where: {
      OR: [
        { user1Id: targetUser.id },
        { user2Id: targetUser.id }
      ]
    }
  });

  console.log(`📊 Total des matchs: ${totalMatches}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
