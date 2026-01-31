// scripts/generate-birthdates.ts - Génère des dates de naissance basées sur l'âge
// Usage: npx ts-node scripts/generate-birthdates.ts

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Calcule le signe du zodiaque à partir d'une date
function calculateZodiacSign(month: number, day: number): string {
  const zodiacDates = [
    { sign: 'capricorne', startMonth: 1, startDay: 1, endMonth: 1, endDay: 19 },
    { sign: 'verseau', startMonth: 1, startDay: 20, endMonth: 2, endDay: 18 },
    { sign: 'poissons', startMonth: 2, startDay: 19, endMonth: 3, endDay: 20 },
    { sign: 'belier', startMonth: 3, startDay: 21, endMonth: 4, endDay: 19 },
    { sign: 'taureau', startMonth: 4, startDay: 20, endMonth: 5, endDay: 20 },
    { sign: 'gemeaux', startMonth: 5, startDay: 21, endMonth: 6, endDay: 20 },
    { sign: 'cancer', startMonth: 6, startDay: 21, endMonth: 7, endDay: 22 },
    { sign: 'lion', startMonth: 7, startDay: 23, endMonth: 8, endDay: 22 },
    { sign: 'vierge', startMonth: 8, startDay: 23, endMonth: 9, endDay: 22 },
    { sign: 'balance', startMonth: 9, startDay: 23, endMonth: 10, endDay: 22 },
    { sign: 'scorpion', startMonth: 10, startDay: 23, endMonth: 11, endDay: 21 },
    { sign: 'sagittaire', startMonth: 11, startDay: 22, endMonth: 12, endDay: 21 },
    { sign: 'capricorne', startMonth: 12, startDay: 22, endMonth: 12, endDay: 31 },
  ];

  for (const zodiac of zodiacDates) {
    if (
      (month === zodiac.startMonth && day >= zodiac.startDay) ||
      (month === zodiac.endMonth && day <= zodiac.endDay)
    ) {
      return zodiac.sign;
    }
  }
  return 'capricorne';
}

// Génère une date de naissance aléatoire pour un âge donné, correspondant au zodiacSign
function generateBirthDate(age: number, zodiacSign: string): Date {
  const today = new Date();
  const birthYear = today.getFullYear() - age;

  // Plages de dates pour chaque signe
  const zodiacRanges: Record<string, { startMonth: number; startDay: number; endMonth: number; endDay: number }> = {
    belier: { startMonth: 3, startDay: 21, endMonth: 4, endDay: 19 },
    taureau: { startMonth: 4, startDay: 20, endMonth: 5, endDay: 20 },
    gemeaux: { startMonth: 5, startDay: 21, endMonth: 6, endDay: 20 },
    cancer: { startMonth: 6, startDay: 21, endMonth: 7, endDay: 22 },
    lion: { startMonth: 7, startDay: 23, endMonth: 8, endDay: 22 },
    vierge: { startMonth: 8, startDay: 23, endMonth: 9, endDay: 22 },
    balance: { startMonth: 9, startDay: 23, endMonth: 10, endDay: 22 },
    scorpion: { startMonth: 10, startDay: 23, endMonth: 11, endDay: 21 },
    sagittaire: { startMonth: 11, startDay: 22, endMonth: 12, endDay: 21 },
    capricorne: { startMonth: 12, startDay: 22, endMonth: 1, endDay: 19 },
    verseau: { startMonth: 1, startDay: 20, endMonth: 2, endDay: 18 },
    poissons: { startMonth: 2, startDay: 19, endMonth: 3, endDay: 20 },
  };

  const range = zodiacRanges[zodiacSign] || zodiacRanges.capricorne;

  // Choisir un jour aléatoire dans la plage du signe
  let month: number;
  let day: number;

  if (range.startMonth === range.endMonth) {
    month = range.startMonth;
    day = range.startDay + Math.floor(Math.random() * (range.endDay - range.startDay + 1));
  } else if (range.startMonth === 12 && range.endMonth === 1) {
    // Capricorne traverse la fin d'année
    if (Math.random() < 0.5) {
      month = 12;
      day = range.startDay + Math.floor(Math.random() * (31 - range.startDay + 1));
    } else {
      month = 1;
      day = 1 + Math.floor(Math.random() * range.endDay);
    }
  } else {
    // Choisir aléatoirement le mois de début ou de fin
    if (Math.random() < 0.5) {
      month = range.startMonth;
      const daysInMonth = new Date(birthYear, month, 0).getDate();
      day = range.startDay + Math.floor(Math.random() * (daysInMonth - range.startDay + 1));
    } else {
      month = range.endMonth;
      day = 1 + Math.floor(Math.random() * range.endDay);
    }
  }

  // Ajuster l'année si la date n'est pas encore passée cette année
  let finalYear = birthYear;
  const birthDate = new Date(finalYear, month - 1, day);
  const todayThisYear = new Date(today.getFullYear(), month - 1, day);

  if (todayThisYear > today) {
    // L'anniversaire n'est pas encore passé, donc on prend l'année précédente
    finalYear = birthYear;
  }

  return new Date(finalYear, month - 1, day);
}

async function main() {
  console.log('🔄 Génération des dates de naissance...\n');

  // Récupérer les utilisateurs sans birthDate mais avec un age et zodiacSign
  const usersWithoutBirthDate = await prisma.user.findMany({
    where: {
      birthDate: null,
      age: { not: null }
    },
    select: {
      id: true,
      name: true,
      age: true,
      zodiacSign: true
    }
  });

  console.log(`📊 ${usersWithoutBirthDate.length} utilisateurs sans birthDate\n`);

  if (usersWithoutBirthDate.length === 0) {
    console.log('✅ Tous les utilisateurs ont déjà une birthDate');
    return;
  }

  let updated = 0;
  for (const user of usersWithoutBirthDate) {
    if (!user.age) continue;

    const zodiacSign = user.zodiacSign || 'capricorne';
    const birthDate = generateBirthDate(user.age, zodiacSign);

    await prisma.user.update({
      where: { id: user.id },
      data: { birthDate }
    });

    updated++;
    const formattedDate = birthDate.toLocaleDateString('fr-FR');
    console.log(`  ✓ ${user.name || 'Utilisateur'} (${user.age} ans, ${zodiacSign}) -> ${formattedDate}`);
  }

  console.log(`\n✅ ${updated} utilisateurs mis à jour avec une birthDate`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
