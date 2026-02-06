// scripts/check-user.js
// Usage: node scripts/check-user.js <email>

const { PrismaClient } = require('@prisma/client');

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.log('Usage: node scripts/check-user.js <email>');
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        accountStatus: true,
        createdAt: true,
        onboardingCompletedAt: true
      }
    });

    if (user) {
      console.log('\n✅ Utilisateur trouvé:');
      console.log(JSON.stringify(user, null, 2));
    } else {
      console.log('\n❌ Utilisateur NON trouvé avec email:', email);
    }
  } catch (error) {
    console.error('Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
