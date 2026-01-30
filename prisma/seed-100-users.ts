// prisma/seed-100-users.ts
// Script pour créer 100 utilisateurs avec 6 photos chacun + likes réciproques

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Mot de passe commun pour tous les utilisateurs de test
const PASSWORD = 'password123';

// Photos Unsplash femmes
const femalePhotoUrls = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1491349174775-aaafddd81942?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1485893086445-ed75865251e0?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1524638431109-93d95c968f03?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1504703395950-b89145a5425b?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1496440737103-cd596325d314?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1515023115689-589c33041d3c?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1464863979621-258859e62245?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1523264653568-53d67a18afc6?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1499887142886-791eca5918cd?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1548142813-c348350df52b?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1592621385612-4d7129426394?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1597223557154-721c1cecc4b0?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1601288496920-b6154fe3626a?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1558898479-33c0057a5d12?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1569124589354-615739ae007b?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1557862921-37829c790f19?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1546961342-ea1f71b193f9?w=400&h=600&fit=crop',
];

// Photos Unsplash hommes
const malePhotoUrls = [
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1522556189639-b150ed9c4330?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1534030347209-467a5b0ad3e6?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1548372290-8d01b6c8e78c?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1495603889488-42d1d66e5523?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1463453091185-61582044d556?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1557862921-37829c790f19?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1488161628813-04466f0fb8fb?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1480455624313-e29b44bbfde1?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1528892952291-009c663ce843?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1545167622-3a6ac756afa4?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1583864697784-a0efc8379f70?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1618886614638-80e3c103d2dc?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1590086782957-93c06ef21604?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1499996860823-5f5ab8920a6a?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1605087880595-8cc6db61f3c6?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?w=400&h=600&fit=crop',
];

// Prénoms féminins
const femaleNames = [
  'Emma', 'Louise', 'Jade', 'Alice', 'Chloé', 'Léa', 'Manon', 'Inès', 'Camille', 'Sarah',
  'Léonie', 'Zoé', 'Lola', 'Anna', 'Juliette', 'Rose', 'Charlotte', 'Romane', 'Nina', 'Margot',
  'Eva', 'Clara', 'Pauline', 'Anaïs', 'Lucie', 'Mathilde', 'Lisa', 'Julie', 'Océane', 'Ambre',
  'Mila', 'Lina', 'Victoria', 'Amélie', 'Élise', 'Laura', 'Marine', 'Célia', 'Agathe', 'Elena',
  'Clémence', 'Noémie', 'Maëlys', 'Alicia', 'Yasmine', 'Sofia', 'Élodie', 'Audrey', 'Morgane', 'Salomé',
];

// Prénoms masculins
const maleNames = [
  'Lucas', 'Hugo', 'Louis', 'Gabriel', 'Raphaël', 'Jules', 'Adam', 'Léo', 'Nathan', 'Ethan',
  'Paul', 'Mathis', 'Alexandre', 'Thomas', 'Antoine', 'Maxime', 'Théo', 'Arthur', 'Clément', 'Romain',
  'Victor', 'Noah', 'Enzo', 'Pierre', 'Axel', 'Baptiste', 'Valentin', 'Julien', 'Nicolas', 'Samuel',
  'Adrien', 'Benjamin', 'Quentin', 'Matthieu', 'Alexis', 'Guillaume', 'Kevin', 'Dylan', 'Florian', 'Simon',
  'Damien', 'Charles', 'Marc', 'Olivier', 'David', 'Fabien', 'Jérémy', 'Anthony', 'Sébastien', 'Vincent',
];

// Villes françaises
const cities = [
  'Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Toulouse', 'Nantes', 'Nice', 'Lille',
  'Strasbourg', 'Montpellier', 'Rennes', 'Reims', 'Dijon', 'Grenoble', 'Angers',
  'Le Mans', 'Aix-en-Provence', 'Clermont-Ferrand', 'Tours', 'Limoges',
];

// Professions
const professions = [
  'Développeur/se', 'Designer', 'Médecin', 'Avocat/e', 'Architecte', 'Journaliste',
  'Photographe', 'Chef cuisinier', 'Professeur/e', 'Ingénieur/e', 'Infirmier/ère',
  'Consultant/e', 'Entrepreneur/se', 'Artiste', 'Musicien/ne', 'Coach sportif',
  'Commercial/e', 'Marketing Manager', 'Comptable', 'Psychologue', 'Chercheur/se',
  'Vétérinaire', 'Kinésithérapeute', 'Directeur/rice', 'Étudiant/e',
];

// Intérêts
const allInterests = [
  'Voyage', 'Musique', 'Cinéma', 'Lecture', 'Sport', 'Cuisine', 'Photo', 'Art',
  'Nature', 'Randonnée', 'Yoga', 'Fitness', 'Danse', 'Gaming', 'Tech', 'Mode',
  'Vin', 'Gastronomie', 'Théâtre', 'Concerts', 'Animaux', 'Jardinage', 'Méditation',
  'Running', 'Vélo', 'Natation', 'Ski', 'Surf', 'Escalade', 'Café', 'Brunch',
];

// Bios templates
const bioTemplates = [
  "Passionné(e) par {interest1} et {interest2}. {profession} dans la vie, aventurier/ère dans l'âme.",
  "{profession} le jour, amateur/trice de {interest1} le soir. Je cherche quelqu'un pour partager mes passions.",
  "Fan de {interest1}, {interest2} et {interest3}. J'adore explorer de nouveaux endroits et rencontrer des gens intéressants.",
  "La vie est trop courte pour s'ennuyer ! {interest1}, {interest2} et bons moments sont mes maîtres mots.",
  "{profession} passionné(e). Quand je ne travaille pas, vous me trouverez à {interest1} ou {interest2}.",
  "Curieux/se de tout, je suis toujours partant(e) pour découvrir {interest1} ou tester un nouveau resto.",
  "Entre {interest1} et {interest2}, mon cœur balance. Et toi, tu préfères quoi ?",
  "Simple, authentique, {profession}. J'aime {interest1}, les bons films et les discussions jusqu'au bout de la nuit.",
];

// Types de corps
const bodyTypes = ['Mince', 'Normal', 'Athlétique', 'Musclé', 'Rond'];
const eyeColors = ['Bleu', 'Vert', 'Marron', 'Noisette', 'Gris', 'Noir'];
const hairColors = ['Blond', 'Châtain', 'Brun', 'Noir', 'Roux', 'Gris'];

function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateBio(profession: string, interests: string[]): string {
  const template = getRandomItem(bioTemplates);
  return template
    .replace('{profession}', profession)
    .replace('{interest1}', interests[0] || 'voyage')
    .replace('{interest2}', interests[1] || 'musique')
    .replace('{interest3}', interests[2] || 'cinéma');
}

async function main() {
  console.log('🌱 Création de 100 utilisateurs avec 6 photos chacun...\n');

  // Hasher le mot de passe une seule fois
  const hashedPassword = await bcrypt.hash(PASSWORD, 12);
  console.log(`🔐 Mot de passe hashé pour tous les utilisateurs (${PASSWORD})`);

  // Récupérer tous les utilisateurs existants pour les likes réciproques
  const existingUsers = await prisma.user.findMany({
    where: { accountStatus: 'ACTIVE' },
    select: { id: true, name: true, gender: true },
  });
  console.log(`📊 ${existingUsers.length} utilisateurs existants trouvés\n`);

  const newUsers: { id: string; name: string; gender: string }[] = [];
  let usersCreated = 0;

  // Créer 50 femmes et 50 hommes
  for (let i = 0; i < 100; i++) {
    const isFemale = i < 50;
    const names = isFemale ? femaleNames : maleNames;
    const photos = isFemale ? femalePhotoUrls : malePhotoUrls;
    const gender = isFemale ? 'FEMALE' : 'MALE';
    const preferredGender = isFemale ? 'MALE' : 'FEMALE';

    const name = names[i % names.length];
    const suffix = Math.floor(i / names.length) + 1;
    const email = `${name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}${suffix > 1 ? suffix : ''}@flowdating.test`;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log(`⏭️  ${name} (${email}) existe déjà`);
      newUsers.push({ id: existingUser.id, name: existingUser.name || name, gender: existingUser.gender || gender });
      continue;
    }

    const age = 22 + Math.floor(Math.random() * 18); // 22-39 ans
    const profession = getRandomItem(professions);
    const interests = getRandomItems(allInterests, 4 + Math.floor(Math.random() * 3)); // 4-6 intérêts
    const city = getRandomItem(cities);

    // Sélectionner 6 photos
    const userPhotos = [];
    for (let j = 0; j < 6; j++) {
      const photoIndex = (i * 6 + j) % photos.length;
      userPhotos.push({
        url: photos[photoIndex],
        isPrimary: j === 0,
        moderationStatus: 'APPROVED' as const,
      });
    }

    try {
      const user = await prisma.user.create({
        data: {
          email,
          hashedPassword,
          name,
          age,
          gender,
          bio: generateBio(profession, interests),
          location: city,
          profession,
          interests,
          height: 155 + Math.floor(Math.random() * 35), // 155-189 cm
          bodyType: getRandomItem(bodyTypes),
          eyeColor: getRandomItem(eyeColors),
          hairColor: getRandomItem(hairColors),
          accountStatus: 'ACTIVE',
          isOnline: Math.random() > 0.7,
          lastSeen: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // 0-7 jours
          emailVerified: new Date(),
          photos: {
            create: userPhotos,
          },
          preferences: {
            create: {
              minAge: 20,
              maxAge: 45,
              maxDistance: 50 + Math.floor(Math.random() * 100),
              gender: preferredGender,
            },
          },
        },
        include: {
          photos: true,
        },
      });

      newUsers.push({ id: user.id, name: user.name || name, gender });
      usersCreated++;

      if (usersCreated % 10 === 0) {
        console.log(`✅ ${usersCreated} utilisateurs créés...`);
      }
    } catch (error) {
      console.error(`❌ Erreur création ${name}:`, error);
    }
  }

  console.log(`\n✅ ${usersCreated} nouveaux utilisateurs créés`);
  console.log(`📷 ${usersCreated * 6} photos ajoutées\n`);

  // Créer des likes réciproques
  console.log('💖 Création des likes réciproques...\n');

  const allUsers = [...existingUsers, ...newUsers];
  let likesCreated = 0;
  let matchesCreated = 0;

  // Pour chaque nouvel utilisateur, créer des likes avec des utilisateurs existants
  for (const newUser of newUsers) {
    // Trouver des utilisateurs du sexe opposé
    const potentialMatches = allUsers.filter(u =>
      u.id !== newUser.id &&
      u.gender !== newUser.gender
    );

    // Créer 5-15 likes par utilisateur
    const likeCount = 5 + Math.floor(Math.random() * 11);
    const targets = getRandomItems(potentialMatches, Math.min(likeCount, potentialMatches.length));

    for (const target of targets) {
      try {
        // Vérifier si le like existe déjà
        const existingLike = await prisma.like.findUnique({
          where: {
            senderId_receiverId: {
              senderId: newUser.id,
              receiverId: target.id,
            },
          },
        });

        if (!existingLike) {
          await prisma.like.create({
            data: {
              senderId: newUser.id,
              receiverId: target.id,
            },
          });
          likesCreated++;

          // 60% de chance de créer un like réciproque (= match)
          if (Math.random() < 0.6) {
            const reverseLikeExists = await prisma.like.findUnique({
              where: {
                senderId_receiverId: {
                  senderId: target.id,
                  receiverId: newUser.id,
                },
              },
            });

            if (!reverseLikeExists) {
              await prisma.like.create({
                data: {
                  senderId: target.id,
                  receiverId: newUser.id,
                },
              });
              likesCreated++;
              matchesCreated++;
            }
          }
        }
      } catch (error) {
        // Ignorer les erreurs de duplicata
      }
    }
  }

  // Créer aussi des likes entre les utilisateurs existants
  console.log('💕 Création de likes supplémentaires entre utilisateurs existants...');

  for (const user of existingUsers) {
    const potentialMatches = allUsers.filter(u =>
      u.id !== user.id &&
      u.gender !== user.gender
    );

    // 3-8 likes supplémentaires par utilisateur existant
    const likeCount = 3 + Math.floor(Math.random() * 6);
    const targets = getRandomItems(potentialMatches, Math.min(likeCount, potentialMatches.length));

    for (const target of targets) {
      try {
        const existingLike = await prisma.like.findUnique({
          where: {
            senderId_receiverId: {
              senderId: user.id,
              receiverId: target.id,
            },
          },
        });

        if (!existingLike) {
          await prisma.like.create({
            data: {
              senderId: user.id,
              receiverId: target.id,
            },
          });
          likesCreated++;

          // 50% de chance de match pour les existants
          if (Math.random() < 0.5) {
            const reverseLikeExists = await prisma.like.findUnique({
              where: {
                senderId_receiverId: {
                  senderId: target.id,
                  receiverId: user.id,
                },
              },
            });

            if (!reverseLikeExists) {
              await prisma.like.create({
                data: {
                  senderId: target.id,
                  receiverId: user.id,
                },
              });
              likesCreated++;
              matchesCreated++;
            }
          }
        }
      } catch (error) {
        // Ignorer les erreurs
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 TERMINÉ !');
  console.log('='.repeat(60));
  console.log(`   👤 ${usersCreated} nouveaux utilisateurs créés`);
  console.log(`   📷 ${usersCreated * 6} photos ajoutées`);
  console.log(`   💖 ${likesCreated} likes créés`);
  console.log(`   💕 ~${matchesCreated} matchs potentiels (likes réciproques)`);
  console.log(`   🔐 Mot de passe: ${PASSWORD}`);
  console.log('='.repeat(60));
  console.log('\n📝 Les utilisateurs peuvent se connecter avec:');
  console.log('   Email: prenom@flowdating.test (ex: emma@flowdating.test)');
  console.log(`   Mot de passe: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
