// scripts/seed-users.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Ajouter ton utilisateur principal en premier
const mainUser = {
  id: 'cmbdml6l20000ogn05zemmdtp', // Ton ID existant
  name: 'Florent LEFEVRE',
  email: 'lefevre.florent@gmail.com',
  age: 18,
  gender: 'HOMME',
  bio: 'Développeur passionné par la création d\'applications web modernes. J\'aime la technologie, le gaming et découvrir de nouvelles personnes !',
  location: 'Laon, Aisne (02)',
  department: 'Aisne',
  region: 'Hauts-de-France',
  postcode: '02000',
  profession: 'Développeur Full Stack',
  maritalStatus: 'CELIBATAIRE',
  zodiacSign: 'VERSEAU',
  dietType: 'OMNIVORE',
  religion: 'ATHEE',
  ethnicity: 'CAUCASIEN',
  interests: ['programmation', 'gaming', 'technologie', 'musique', 'cinema']
};

const testUsers = [
  {
    name: 'Alice Martin',
    email: 'alice@test.com',
    age: 25,
    gender: 'FEMME',
    bio: 'Passionnée de voyage et de photographie. J\'adore découvrir de nouveaux endroits et rencontrer des gens intéressants !',
    location: 'Paris, Paris (75)',
    department: 'Paris',
    region: 'Île-de-France',
    postcode: '75001',
    profession: 'Artiste',
    maritalStatus: 'CELIBATAIRE',
    zodiacSign: 'VIERGE',
    dietType: 'VEGETARIEN',
    religion: 'ATHEE',
    ethnicity: 'CAUCASIEN',
    interests: ['photographie', 'voyage', 'yoga', 'lecture', 'cinema']
  },
  {
    name: 'Bob Durand',
    email: 'bob@test.com',
    age: 28,
    gender: 'HOMME',
    bio: 'Développeur passionné par la tech et le sport. Fan de randonnée le weekend et de concerts de rock !',
    location: 'Lyon, Rhône (69)',
    department: 'Rhône',
    region: 'Auvergne-Rhône-Alpes',
    postcode: '69000',
    profession: 'Développeur',
    maritalStatus: 'CELIBATAIRE',
    zodiacSign: 'LION',
    dietType: 'OMNIVORE',
    religion: 'CATHOLIQUE',
    ethnicity: 'CAUCASIEN',
    interests: ['programmation', 'randonnee', 'musique', 'gaming', 'sport']
  },
  {
    name: 'Charlotte Leroy',
    email: 'charlotte@test.com',
    age: 23,
    gender: 'FEMME',
    bio: 'Étudiante en médecine, amoureuse de la nature et des animaux. Toujours prête pour une aventure !',
    location: 'Toulouse, Haute-Garonne (31)',
    department: 'Haute-Garonne',
    region: 'Occitanie',
    postcode: '31000',
    profession: 'Étudiante en médecine',
    maritalStatus: 'CELIBATAIRE',
    zodiacSign: 'GEMEAUX',
    dietType: 'VEGAN',
    religion: 'AGNOSTIQUE',
    ethnicity: 'CAUCASIEN',
    interests: ['nature', 'animaux', 'meditation', 'course', 'cuisine']
  },
  {
    name: 'David Chen',
    email: 'david@test.com',
    age: 32,
    gender: 'HOMME',
    bio: 'Chef cuisinier créatif, passionné de gastronomie et de vins. J\'aime partager de bons moments autour d\'une table.',
    location: 'Marseille, Bouches-du-Rhône (13)',
    department: 'Bouches-du-Rhône',
    region: 'Provence-Alpes-Côte d\'Azur',
    postcode: '13000',
    profession: 'Chef cuisinier',
    maritalStatus: 'DIVORCE',
    zodiacSign: 'SCORPION',
    dietType: 'OMNIVORE',
    religion: 'BOUDDHISTE',
    ethnicity: 'ASIATIQUE',
    interests: ['cuisine', 'vin', 'voyage', 'art', 'gastronomie']
  },
  {
    name: 'Emma Rodriguez',
    email: 'emma@test.com',
    age: 27,
    gender: 'FEMME',
    bio: 'Artiste peintre et professeure d\'art. Je trouve l\'inspiration dans la beauté du quotidien et les rencontres authentiques.',
    location: 'Bordeaux, Gironde (33)',
    department: 'Gironde',
    region: 'Nouvelle-Aquitaine',
    postcode: '33000',
    profession: 'Artiste peintre',
    maritalStatus: 'CELIBATAIRE',
    zodiacSign: 'POISSONS',
    dietType: 'VEGETARIEN',
    religion: 'SPIRITUEL',
    ethnicity: 'LATINO',
    interests: ['art', 'peinture', 'danse', 'musique', 'theatre']
  },
  {
    name: 'Lucas Moreau',
    email: 'lucas@test.com',
    age: 29,
    gender: 'HOMME',
    bio: 'Avocat spécialisé en droit de l\'environnement. Passionné de justice sociale et de protection de la planète.',
    location: 'Strasbourg, Bas-Rhin (67)',
    department: 'Bas-Rhin',
    region: 'Grand Est',
    postcode: '67000',
    profession: 'Avocat',
    maritalStatus: 'CELIBATAIRE',
    zodiacSign: 'BALANCE',
    dietType: 'VEGETARIEN',
    religion: 'PROTESTANT',
    ethnicity: 'CAUCASIEN',
    interests: ['environnement', 'lecture', 'politique', 'randonnee', 'justice']
  },
  {
    name: 'Sophie Dubois',
    email: 'sophie@test.com',
    age: 26,
    gender: 'FEMME',
    bio: 'Infirmière en pédiatrie, j\'adore mon métier ! Passionnée de danse et de cuisine du monde. Toujours souriante !',
    location: 'Lille, Nord (59)',
    department: 'Nord',
    region: 'Hauts-de-France',
    postcode: '59000',
    profession: 'Infirmière',
    maritalStatus: 'CELIBATAIRE',
    zodiacSign: 'CANCER',
    dietType: 'OMNIVORE',
    religion: 'CATHOLIQUE',
    ethnicity: 'CAUCASIEN',
    interests: ['danse', 'cuisine', 'enfants', 'voyage', 'bien-etre']
  },
  {
    name: 'Antoine Petit',
    email: 'antoine@test.com',
    age: 31,
    gender: 'HOMME',
    bio: 'Architecte passionné par l\'urbanisme durable. Fan de vélo, de café et de architecture moderne.',
    location: 'Nantes, Loire-Atlantique (44)',
    department: 'Loire-Atlantique',
    region: 'Pays de la Loire',
    postcode: '44000',
    profession: 'Architecte',
    maritalStatus: 'DIVORCE',
    zodiacSign: 'CAPRICORNE',
    dietType: 'OMNIVORE',
    religion: 'ATHEE',
    ethnicity: 'CAUCASIEN',
    interests: ['architecture', 'velo', 'design', 'urbanisme', 'cafe']
  },
  {
    name: 'Camille Faure',
    email: 'camille@test.com',
    age: 24,
    gender: 'NON_BINAIRE',
    bio: 'Journaliste indépendant·e, militant·e pour les droits LGBTQ+. Passionné·e d\'écriture et de photojournalisme.',
    location: 'Montpellier, Hérault (34)',
    department: 'Hérault',
    region: 'Occitanie',
    postcode: '34000',
    profession: 'Journaliste',
    maritalStatus: 'CELIBATAIRE',
    zodiacSign: 'VERSEAU',
    dietType: 'VEGAN',
    religion: 'SPIRITUEL',
    ethnicity: 'CAUCASIEN',
    interests: ['ecriture', 'militantisme', 'photographie', 'politique', 'droits-humains']
  },
  {
    name: 'Marie Blanchard',
    email: 'marie@test.com',
    age: 30,
    gender: 'FEMME',
    bio: 'Professeure des écoles passionnée d\'éducation alternative. J\'aime la montagne, les livres et les discussions profondes.',
    location: 'Grenoble, Isère (38)',
    department: 'Isère',
    region: 'Auvergne-Rhône-Alpes',
    postcode: '38000',
    profession: 'Professeure',
    maritalStatus: 'CELIBATAIRE',
    zodiacSign: 'TAUREAU',
    dietType: 'VEGETARIEN',
    religion: 'AGNOSTIQUE',
    ethnicity: 'CAUCASIEN',
    interests: ['education', 'montagne', 'lecture', 'philosophie', 'enfants']
  }
];

async function seedUsers() {
  console.log('🌱 Début du seeding des utilisateurs...');

  // Créer d'abord ton utilisateur principal
  try {
    const existingMainUser = await prisma.user.findUnique({
      where: { email: mainUser.email }
    });

    if (!existingMainUser) {
      const hashedPassword = await bcrypt.hash('password123', 12);
      
      const user = await prisma.user.create({
        data: {
          ...mainUser,
          hashedPassword,
          emailVerified: new Date(),
          primaryAuthMethod: 'EMAIL_PASSWORD'
        }
      });

      console.log(`✅ Utilisateur principal créé: ${user.name} (${user.email})`);

      // Créer tes préférences
      await prisma.userPreferences.create({
        data: {
          userId: user.id,
          minAge: 18,
          maxAge: 30,
          maxDistance: 100,
          gender: 'femme',
          lookingFor: 'relation-casual'
        }
      });

      console.log(`✅ Préférences créées pour ${user.name}`);
    } else {
      console.log(`⏭️  Utilisateur principal ${mainUser.email} existe déjà`);
    }
  } catch (error) {
    console.error(`❌ Erreur lors de la création de l'utilisateur principal:`, error);
  }

  // Créer les autres utilisateurs
  for (const userData of testUsers) {
    try {
      // Vérifier si l'utilisateur existe déjà
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        console.log(`⏭️  Utilisateur ${userData.email} existe déjà, passage au suivant`);
        continue;
      }

      // Créer l'utilisateur
      const hashedPassword = await bcrypt.hash('password123', 12);
      
      const user = await prisma.user.create({
        data: {
          ...userData,
          hashedPassword,
          emailVerified: new Date(),
          primaryAuthMethod: 'EMAIL_PASSWORD'
        }
      });

      console.log(`✅ Utilisateur créé: ${user.name} (${user.email})`);

      // Créer des préférences par défaut
      const preferredGender = userData.gender === 'HOMME' ? 'femme' : 
                            userData.gender === 'FEMME' ? 'homme' : 'tous';

      await prisma.userPreferences.create({
        data: {
          userId: user.id,
          minAge: Math.max(18, userData.age - 10),
          maxAge: userData.age + 15,
          maxDistance: 100,
          gender: preferredGender,
          lookingFor: 'relation-serieuse'
        }
      });

      console.log(`✅ Préférences créées pour ${user.name}`);

    } catch (error) {
      console.error(`❌ Erreur lors de la création de ${userData.email}:`, error);
    }
  }

  // Créer quelques interactions de test
  console.log('🔗 Création d\'interactions de test...');
  
  try {
    const florent = await prisma.user.findUnique({ where: { email: mainUser.email } });
    const sophie = await prisma.user.findUnique({ where: { email: 'sophie@test.com' } });
    const emma = await prisma.user.findUnique({ where: { email: 'emma@test.com' } });

    if (florent && sophie && emma) {
      // Match entre toi et Sophie
      await prisma.like.upsert({
        where: { senderId_receiverId: { senderId: florent.id, receiverId: sophie.id } },
        update: {},
        create: { senderId: florent.id, receiverId: sophie.id }
      });

      await prisma.like.upsert({
        where: { senderId_receiverId: { senderId: sophie.id, receiverId: florent.id } },
        update: {},
        create: { senderId: sophie.id, receiverId: florent.id }
      });

      // Créer le match
      const existingMatch = await prisma.match.findFirst({
        where: {
          users: {
            every: {
              id: { in: [florent.id, sophie.id] }
            }
          }
        }
      });

      if (!existingMatch) {
        const match = await prisma.match.create({
          data: {
            users: {
              connect: [{ id: florent.id }, { id: sophie.id }]
            }
          }
        });

        console.log('✅ Match créé entre Florent et Sophie');

        // Ajouter quelques messages
        await prisma.message.createMany({
          data: [
            {
              content: 'Salut Sophie ! Super qu\'on ait matché 😊',
              senderId: florent.id,
              receiverId: sophie.id,
              matchId: match.id
            },
            {
              content: 'Salut Florent ! Oui c\'est cool ! Comment ça va ?',
              senderId: sophie.id,
              receiverId: florent.id,
              matchId: match.id
            }
          ]
        });

        console.log('✅ Messages de test créés');
      }

      // Like en attente vers Emma
      await prisma.like.upsert({
        where: { senderId_receiverId: { senderId: florent.id, receiverId: emma.id } },
        update: {},
        create: { senderId: florent.id, receiverId: emma.id }
      });

      console.log('✅ Like en attente créé (Florent → Emma)');
    }

  } catch (error) {
    console.error('❌ Erreur lors de la création des interactions:', error);
  }

  console.log('\n🎉 Seeding terminé avec succès !');
  console.log('📊 Résumé :');
  console.log(`- ${testUsers.length + 1} utilisateurs créés`);
  console.log('- 1 match (Florent ↔ Sophie) avec messages');
  console.log('- 1 like en attente (Florent → Emma)');
  console.log('- Préférences configurées pour tous');
}

// Exécuter le seeding
seedUsers()
  .catch((error) => {
    console.error('❌ Erreur during seeding:', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });