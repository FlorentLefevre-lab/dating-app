// scripts/update-zodiac.ts - Attribue un zodiacSign aux utilisateurs existants
// Usage: npx ts-node scripts/update-zodiac.ts

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ZODIAC_SIGNS = [
  'belier', 'taureau', 'gemeaux', 'cancer', 'lion', 'vierge',
  'balance', 'scorpion', 'sagittaire', 'capricorne', 'verseau', 'poissons'
];

async function main() {
  console.log('🔄 Mise à jour des signes du zodiaque...');

  // Récupérer les utilisateurs sans zodiacSign
  const usersWithoutZodiac = await prisma.user.findMany({
    where: {
      zodiacSign: null
    },
    select: {
      id: true,
      name: true,
      age: true
    }
  });

  console.log(`📊 ${usersWithoutZodiac.length} utilisateurs sans zodiacSign`);

  if (usersWithoutZodiac.length === 0) {
    console.log('✅ Tous les utilisateurs ont déjà un zodiacSign');
    return;
  }

  // Attribuer un signe basé sur l'ID (déterministe mais varié)
  let updated = 0;
  for (const user of usersWithoutZodiac) {
    // Utiliser le hash de l'ID pour déterminer le signe
    const hash = user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const signIndex = hash % ZODIAC_SIGNS.length;
    const zodiacSign = ZODIAC_SIGNS[signIndex];

    await prisma.user.update({
      where: { id: user.id },
      data: { zodiacSign }
    });

    updated++;
    console.log(`  ✓ ${user.name || 'Utilisateur'} -> ${zodiacSign}`);
  }

  console.log(`\n✅ ${updated} utilisateurs mis à jour avec un zodiacSign`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
