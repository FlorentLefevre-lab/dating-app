// scripts/simple-generate.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Génération dating app data...');
  
  // Hasher le mot de passe une seule fois
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash('123456', saltRounds);
  console.log('🔐 Mot de passe hashé généré');
  
  // Nettoyer
  await prisma.message.deleteMany();
  await prisma.match.deleteMany();
  await prisma.like.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ DB nettoyée');
  
  // Créer David Chen avec email vérifié
  const david = await prisma.user.create({
    data: {
      id: 'cmbedj6mo000bogepbtfp21el',
      name: 'David Chen',
      email: 'david@test.com',
      hashedPassword: hashedPassword,
      emailVerified: new Date(), // ✨ Email marqué comme vérifié
    }
  });
  
  // Créer 5 autres users avec emails vérifiés
  const users = [];
  const names = ['Marie Dubois', 'Alex Martin', 'Sophie Laurent', 'Thomas Moreau', 'Emma Rodriguez'];
  
  for (let i = 0; i < names.length; i++) {
    const user = await prisma.user.create({
      data: {
        name: names[i],
        email: `user${i}@test.com`,
        hashedPassword: hashedPassword,
        emailVerified: new Date(), // ✨ Email marqué comme vérifié
        image: `https://images.unsplash.com/photo-${1494790108755 + i}?w=150&h=150&fit=crop`
      }
    });
    users.push(user);
  }
  
  console.log(`✅ ${users.length + 1} utilisateurs créés avec emails vérifiés automatiquement`);
  
  // Créer likes réciproques (David avec tous)
  for (const user of users) {
    // David → User
    await prisma.like.create({
      data: { senderId: david.id, receiverId: user.id }
    });
    
    // User → David
    await prisma.like.create({
      data: { senderId: user.id, receiverId: david.id }
    });
  }
  
  console.log(`✅ ${users.length * 2} likes créés`);
  
  // Créer matches
  for (const user of users) {
    const match = await prisma.match.create({
      data: {
        users: {
          connect: [{ id: david.id }, { id: user.id }]
        }
      }
    });
    
    // Message de démarrage
    await prisma.message.create({
      data: {
        content: `Salut David ! Comment ça va ? 😊`,
        senderId: user.id,
        receiverId: david.id,
        matchId: match.id
      }
    });
  }
  
  console.log(`✅ ${users.length} matches et messages créés`);
  console.log('🎉 David Chen a maintenant 5 conversations !');
  console.log('🔐 Tous les comptes ont le mot de passe hashé: 123456 (bcrypt)');
  console.log('📧 Tous les emails sont marqués comme vérifiés pour les tests');
  
  await prisma.$disconnect();
}

main().catch(console.error);