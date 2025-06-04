import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Types pour les données
interface UserData {
  name: string;
  email: string;
  hashedPassword: string;
  primaryAuthMethod: 'EMAIL_PASSWORD';
  age: number;
  bio: string;
  location: string;
  profession: string;
  gender: string;
  maritalStatus: string;
  zodiacSign: string;
  dietType: string;
  religion: string;
  interests: string[];
  department: string;
  ethnicity: string;
  postcode: string;
  region: string;
  lastSeen: Date;
  isOnline: boolean;
}

interface LikeData {
  senderId: string;
  receiverId: string;
  createdAt: Date;
}

interface Match {
  user1: string;
  user2: string;
}

// Données de test réalistes
const firstNames: string[] = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'William',
  'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia', 'Lucas', 'Harper', 'Henry', 'Evelyn', 'Alexander',
  'Abigail', 'Michael', 'Emily', 'Daniel', 'Elizabeth', 'Jacob', 'Mila', 'Logan', 'Ella', 'Jackson',
  'Avery', 'Levi', 'Sofia', 'Sebastian', 'Camila', 'Mateo', 'Aria', 'Jack', 'Scarlett', 'Owen',
  'Victoria', 'Theodore', 'Madison', 'Aiden', 'Luna', 'Samuel', 'Grace', 'Joseph', 'Chloe', 'John',
  'Penelope', 'David', 'Layla', 'Wyatt', 'Riley', 'Matthew', 'Zoey', 'Luke', 'Nora', 'Asher',
  'Lily', 'Carter', 'Eleanor', 'Julian', 'Hannah', 'Grayson', 'Lillian', 'Leo', 'Addison', 'Jayden',
  'Aubrey', 'Gabriel', 'Ellie', 'Isaac', 'Stella', 'Oliver', 'Natalie', 'Jonathan', 'Zoe', 'Connor',
  'Leah', 'Jeremiah', 'Hazel', 'Ryan', 'Violet', 'Adrian', 'Aurora', 'Maverick', 'Savannah', 'Hudson',
  'Audrey', 'Colton', 'Brooklyn', 'Eli', 'Bella', 'Thomas', 'Claire', 'Aaron', 'Skylar', 'Ian'
];

const lastNames: string[] = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'
];

const cities: string[] = [
  'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille',
  'Rennes', 'Reims', 'Le Havre', 'Saint-Étienne', 'Toulon', 'Grenoble', 'Dijon', 'Angers', 'Nîmes', 'Villeurbanne'
];

const professions: string[] = [
  'Développeur', 'Designer', 'Marketing', 'Vendeur', 'Professeur', 'Médecin', 'Avocat', 'Ingénieur', 
  'Architecte', 'Chef', 'Artiste', 'Photographe', 'Écrivain', 'Consultant', 'Analyste', 'Manager',
  'Entrepreneur', 'Comptable', 'Infirmier', 'Psychologue', 'Journaliste', 'Musicien', 'Commercial',
  'Technicien', 'Pharmacien', 'Dentiste', 'Vétérinaire', 'Coiffeur', 'Mécanicien', 'Électricien'
];

const genders: string[] = ['Homme', 'Femme', 'Non-binaire'];
const maritalStatuses: string[] = ['Célibataire', 'En couple', 'Divorcé(e)', 'Veuf/Veuve'];
const zodiacSigns: string[] = [
  'Bélier', 'Taureau', 'Gémeaux', 'Cancer', 'Lion', 'Vierge',
  'Balance', 'Scorpion', 'Sagittaire', 'Capricorne', 'Verseau', 'Poissons'
];
const dietTypes: string[] = ['Omnivore', 'Végétarien', 'Végétalien', 'Pescétarien', 'Sans gluten', 'Flexitarien'];
const religions: string[] = ['Catholique', 'Protestant', 'Musulman', 'Juif', 'Bouddhiste', 'Hindou', 'Athée', 'Agnostique'];
const ethnicities: string[] = ['Européenne', 'Africaine', 'Asiatique', 'Latino', 'Moyen-Oriental', 'Mixte'];

const interests: string[] = [
  'Sport', 'Musique', 'Cinéma', 'Lecture', 'Voyage', 'Cuisine', 'Art', 'Technologie',
  'Mode', 'Photographie', 'Danse', 'Théâtre', 'Gaming', 'Fitness', 'Yoga', 'Méditation',
  'Randonnée', 'Vélo', 'Natation', 'Tennis', 'Football', 'Basketball', 'Escalade', 'Surf',
  'Jardinage', 'Bricolage', 'Peinture', 'Écriture', 'Langues', 'Bénévolat', 'Animaux', 'Nature'
];

const regions: string[] = [
  'Île-de-France', 'Auvergne-Rhône-Alpes', 'Nouvelle-Aquitaine', 'Occitanie', 'Hauts-de-France',
  'Grand Est', 'Provence-Alpes-Côte d\'Azur', 'Pays de la Loire', 'Bretagne', 'Normandie',
  'Bourgogne-Franche-Comté', 'Centre-Val de Loire', 'Corse'
];

// Fonctions utilitaires avec types
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements<T>(array: T[], min: number = 1, max: number = 5): T[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateRandomPostcode(): string {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

function generateRandomBio(): string {
  const bios: string[] = [
    "Passionné(e) de voyages et de nouvelles découvertes. J'aime partager de bons moments et rire !",
    "Amateur/trice de bonne cuisine et de soirées entre amis. La vie est belle quand on la partage.",
    "Sportif/ve dans l'âme, j'adore l'aventure et les défis. Toujours prêt(e) pour de nouvelles expériences !",
    "Créatif/ve et curieux/se, j'aime l'art sous toutes ses formes. La beauté est partout si on sait regarder.",
    "Entrepreneur dans l'âme avec une passion pour l'innovation. J'aime construire et créer du lien.",
    "Nature lover qui préfère les couchers de soleil aux écrans. Simplicité et authenticité avant tout.",
    "Mélomane invétéré(e), la musique rythme ma vie. Concerts, festivals, je suis toujours partant(e) !",
    "Lecteur/trice compulsif/ve qui voyage à travers les livres. Une bonne histoire vaut tous les trésors.",
    "Gastronome qui explore le monde une assiette à la fois. Cuisiner et partager, mes plus grands plaisirs.",
    "Digital nomad en quête d'équilibre entre travail et passion. La liberté avant tout !"
  ];
  return getRandomElement(bios);
}

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

async function generateUsers(): Promise<string[]> {
  console.log('🚀 Génération de 100 utilisateurs...');
  
  const hashedPassword = await hashPassword('123456');
  const users: UserData[] = [];

  for (let i = 0; i < 100; i++) {
    const firstName = getRandomElement(firstNames);
    const lastName = getRandomElement(lastNames);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
    
    const userData: UserData = {
      name: `${firstName} ${lastName}`,
      email: email,
      hashedPassword: hashedPassword,
      primaryAuthMethod: 'EMAIL_PASSWORD',
      age: Math.floor(Math.random() * (50 - 18 + 1)) + 18,
      bio: generateRandomBio(),
      location: getRandomElement(cities),
      profession: getRandomElement(professions),
      gender: getRandomElement(genders),
      maritalStatus: getRandomElement(maritalStatuses),
      zodiacSign: getRandomElement(zodiacSigns),
      dietType: getRandomElement(dietTypes),
      religion: getRandomElement(religions),
      interests: getRandomElements(interests, 2, 6),
      department: Math.floor(Math.random() * 95 + 1).toString().padStart(2, '0'),
      ethnicity: getRandomElement(ethnicities),
      postcode: generateRandomPostcode(),
      region: getRandomElement(regions),
      lastSeen: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      isOnline: Math.random() > 0.7,
    };

    users.push(userData);
  }

  await prisma.user.createMany({
    data: users,
    skipDuplicates: true
  });

  console.log('✅ 100 utilisateurs créés avec succès !');
  
  const createdUsers = await prisma.user.findMany({
    select: { id: true }
  });
  
  return createdUsers.map((user: { id: string }) => user.id);
}

async function generatePreferences(userIds: string[]): Promise<void> {
  console.log('🎯 Génération des préférences utilisateur...');
  
  const preferences = userIds.map((userId: string) => ({
    userId,
    minAge: Math.floor(Math.random() * (25 - 18 + 1)) + 18,
    maxAge: Math.floor(Math.random() * (45 - 30 + 1)) + 30,
    maxDistance: Math.floor(Math.random() * (100 - 10 + 1)) + 10,
    gender: Math.random() > 0.5 ? getRandomElement(genders) : null,
    lookingFor: getRandomElement(['Relation sérieuse', 'Relation décontractée', 'Amitié', 'Je ne sais pas encore'])
  }));

  await prisma.userPreferences.createMany({
    data: preferences,
    skipDuplicates: true
  });

  console.log('✅ Préférences utilisateur créées !');
}

async function generatePhotos(userIds: string[]): Promise<void> {
  console.log('📸 Génération des photos de profil...');
  
  const photos: Array<{
    userId: string;
    url: string;
    isPrimary: boolean;
  }> = [];
  
  userIds.forEach((userId: string) => {
    const photoCount = Math.floor(Math.random() * 5) + 1;
    
    for (let i = 0; i < photoCount; i++) {
      photos.push({
        userId,
        url: `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'men' : 'women'}/${Math.floor(Math.random() * 99) + 1}.jpg`,
        isPrimary: i === 0
      });
    }
  });

  await prisma.photo.createMany({
    data: photos,
    skipDuplicates: true
  });

  console.log('✅ Photos de profil créées !');
}

async function generateLikes(userIds: string[]): Promise<LikeData[]> {
  console.log('❤️ Génération des likes...');
  
  const likes: LikeData[] = [];
  const likePairs = new Set<string>();
  
  for (const senderId of userIds) {
    const likeCount = Math.floor(Math.random() * 21) + 5;
    const availableTargets = userIds.filter((id: string) => id !== senderId);
    
    for (let i = 0; i < likeCount && availableTargets.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableTargets.length);
      const receiverId = availableTargets[randomIndex];
      const pairKey = `${senderId}-${receiverId}`;
      
      if (!likePairs.has(pairKey)) {
        likePairs.add(pairKey);
        likes.push({
          senderId,
          receiverId,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        });
        
        availableTargets.splice(randomIndex, 1);
      }
    }
  }

  await prisma.like.createMany({
    data: likes,
    skipDuplicates: true
  });

  console.log(`✅ ${likes.length} likes créés !`);
  return likes;
}

async function generateDislikes(userIds: string[]): Promise<void> {
  console.log('👎 Génération des dislikes...');
  
  const dislikes: Array<{
    senderId: string;
    receiverId: string;
    createdAt: Date;
  }> = [];
  const dislikePairs = new Set<string>();
  
  for (const senderId of userIds) {
    const dislikeCount = Math.floor(Math.random() * 9) + 2;
    const availableTargets = userIds.filter((id: string) => id !== senderId);
    
    for (let i = 0; i < dislikeCount && availableTargets.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableTargets.length);
      const receiverId = availableTargets[randomIndex];
      const pairKey = `${senderId}-${receiverId}`;
      
      if (!dislikePairs.has(pairKey)) {
        dislikePairs.add(pairKey);
        dislikes.push({
          senderId,
          receiverId,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        });
        
        availableTargets.splice(randomIndex, 1);
      }
    }
  }

  await prisma.dislike.createMany({
    data: dislikes,
    skipDuplicates: true
  });

  console.log(`✅ ${dislikes.length} dislikes créés !`);
}

async function generateProfileViews(userIds: string[]): Promise<void> {
  console.log('👀 Génération des vues de profil...');
  
  const profileViews: Array<{
    viewerId: string;
    viewedId: string;
    viewedAt: Date;
  }> = [];
  const viewPairs = new Set<string>();
  
  for (let i = 0; i < 500; i++) {
    const viewerId = getRandomElement(userIds);
    const viewedId = getRandomElement(userIds.filter((id: string) => id !== viewerId));
    const pairKey = `${viewerId}-${viewedId}`;
    
    if (!viewPairs.has(pairKey)) {
      viewPairs.add(pairKey);
      profileViews.push({
        viewerId,
        viewedId,
        viewedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
      });
    }
  }

  await prisma.profileView.createMany({
    data: profileViews,
    skipDuplicates: true
  });

  console.log(`✅ ${profileViews.length} vues de profil créées !`);
}

async function generateMessages(userIds: string[], likes: LikeData[]): Promise<void> {
  console.log('💬 Génération des messages...');
  
  const matches = new Map<string, Match>();
  
  likes.forEach((like: LikeData) => {
    const reverseMatch = likes.find((l: LikeData) => 
      l.senderId === like.receiverId && l.receiverId === like.senderId
    );
    
    if (reverseMatch) {
      const conversationKey = [like.senderId, like.receiverId].sort().join('-');
      if (!matches.has(conversationKey)) {
        matches.set(conversationKey, {
          user1: like.senderId,
          user2: like.receiverId
        });
      }
    }
  });

  console.log(`📱 ${matches.size} matches trouvés, génération des conversations...`);

  const messages: Array<{
    senderId: string;
    receiverId: string;
    content: string;
    messageType: 'TEXT';
    status: 'READ' | 'DELIVERED';
    createdAt: Date;
    readAt: Date | null;
    deliveredAt: Date;
  }> = [];
  
  const sampleMessages: string[] = [
    "Salut ! Comment ça va ?",
    "Hello ! Sympa ton profil 😊",
    "Coucou ! Tu fais quoi de beau ?",
    "Salut ! J'ai vu qu'on avait des goûts en commun !",
    "Hello ! Ça te dit qu'on discute ?",
    "Salut ! Comment s'est passé ta journée ?",
    "Coucou ! Tu es de quelle région ?",
    "Hello ! J'adore tes photos !",
    "Salut ! Tu aimes quoi comme musique ?",
    "Coucou ! Des projets pour le weekend ?",
    "Merci pour le match ! 😍",
    "Super ! J'espère qu'on va bien s'entendre",
    "Parfait ! Raconte-moi un peu tes passions",
    "Génial ! Tu fais du sport ?",
    "Cool ! Tu voyages souvent ?",
    "Ah oui j'adore aussi ! 🎵",
    "Exactement pareil pour moi !",
    "Haha c'est marrant ça ! 😄",
    "Vraiment ? Moi aussi j'adore ça !",
    "C'est clair ! On se ressemble 😊"
  ];

  for (const [conversationKey, match] of Array.from(matches.entries())) {
    const messageCount = Math.floor(Math.random() * 20) + 5;
    const participants = [match.user1, match.user2];
    
    for (let i = 0; i < messageCount; i++) {
      const senderId = getRandomElement(participants);
      const receiverId = participants.find((p: string) => p !== senderId)!;
      
      messages.push({
        senderId,
        receiverId,
        content: getRandomElement(sampleMessages),
        messageType: 'TEXT',
        status: Math.random() > 0.1 ? 'READ' : 'DELIVERED',
        createdAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
        readAt: Math.random() > 0.2 ? new Date(Date.now() - Math.random() * 13 * 24 * 60 * 60 * 1000) : null,
        deliveredAt: new Date(Date.now() - Math.random() * 13 * 24 * 60 * 60 * 1000)
      });
    }
  }

  if (messages.length > 0) {
    await prisma.message.createMany({
      data: messages,
      skipDuplicates: true
    });
  }

  console.log(`✅ ${messages.length} messages créés pour ${matches.size} conversations !`);
}

async function generateNotificationSettings(userIds: string[]): Promise<void> {
  console.log('🔔 Génération des paramètres de notification...');
  
  const notificationSettings = userIds.map((userId: string) => ({
    userId,
    messageNotifications: Math.random() > 0.2,
    soundEnabled: Math.random() > 0.3,
    vibrationEnabled: Math.random() > 0.4,
    quietHours: Math.random() > 0.5 ? {
      start: "22:00",
      end: "08:00"
    } : undefined
  }));

  await prisma.notificationSettings.createMany({
    data: notificationSettings,
    skipDuplicates: true
  });

  console.log('✅ Paramètres de notification créés !');
}

async function main(): Promise<void> {
  try {
    console.log('🎬 Début de la génération des données de test...\n');

    const userIds = await generateUsers();
    await generatePreferences(userIds);
    await generatePhotos(userIds);
    const likes = await generateLikes(userIds);
    await generateDislikes(userIds);
    await generateProfileViews(userIds);
    await generateMessages(userIds, likes);
    await generateNotificationSettings(userIds);

    const stats = await prisma.user.count();
    const likesCount = await prisma.like.count();
    const dislikesCount = await prisma.dislike.count();
    const messagesCount = await prisma.message.count();
    const viewsCount = await prisma.profileView.count();

    console.log('\n🎉 Génération terminée avec succès !');
    console.log('📊 Statistiques finales :');
    console.log(`   👥 Utilisateurs : ${stats}`);
    console.log(`   ❤️  Likes : ${likesCount}`);
    console.log(`   👎 Dislikes : ${dislikesCount}`);
    console.log(`   💬 Messages : ${messagesCount}`);
    console.log(`   👀 Vues de profil : ${viewsCount}`);
    
    console.log('\n🔐 Informations de connexion :');
    console.log('   📧 Email : [nom].[prenom][numero]@example.com (ex: emma.smith0@example.com)');
    console.log('   🔑 Mot de passe : 123456 (pour tous les utilisateurs)');

  } catch (error) {
    console.error('❌ Erreur lors de la génération :', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error('💥 Erreur fatale :', e);
    process.exit(1);
  });