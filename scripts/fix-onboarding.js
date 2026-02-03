// scripts/fix-onboarding.js
require('dotenv').config({ path: '.env.local' });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Mise à jour des utilisateurs existants...');

  const result = await prisma.user.updateMany({
    where: { onboardingCompletedAt: null },
    data: { onboardingCompletedAt: new Date() }
  });

  console.log('Utilisateurs mis à jour:', result.count);

  const stillNull = await prisma.user.count({ where: { onboardingCompletedAt: null } });
  console.log('Utilisateurs sans onboarding:', stillNull);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
