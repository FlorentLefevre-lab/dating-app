// src/app/api/discover/route.ts - Version corrigée autonome
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // Ajustez selon votre config

// 🎯 BASE DE DONNÉES ÉTENDUE (reprise de votre code + améliorations)
const EXTENDED_PROFILES_DB = [
  {
    id: 'alice@test.com',
    name: 'Alice Martin',
    age: 28,
    bio: 'Photographe passionnée de voyage ✈️ Toujours en quête de nouvelles aventures et de beaux paysages à immortaliser.',
    location: 'Paris, Île-de-France',
    department: '75',
    region: 'Île-de-France',
    profession: 'Photographe',
    interests: ['Photographie', 'Voyage', 'Art', 'Nature'],
    photos: [
      { id: 'alice_1', url: 'https://via.placeholder.com/400x600/FFB6C1/000000?text=Alice+1', isPrimary: true },
      { id: 'alice_2', url: 'https://via.placeholder.com/400x600/FFB6C1/000000?text=Alice+2', isPrimary: false }
    ],
    compatibilityScore: 92,
    isActive: true,
    isOnline: Math.random() > 0.5,
    lastActive: new Date(Date.now() - Math.random() * 72 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'bob@test.com',
    name: 'Bob Wilson',
    age: 32,
    bio: 'Entrepreneur dans la tech 💻 Passionné d\'innovation et de nouvelles technologies. Fan de cuisine fusion.',
    location: 'Lyon, Auvergne-Rhône-Alpes',
    department: '69',
    region: 'Auvergne-Rhône-Alpes',
    profession: 'Entrepreneur',
    interests: ['Technologie', 'Cuisine', 'Entrepreneuriat', 'Innovation'],
    photos: [
      { id: 'bob_1', url: 'https://via.placeholder.com/400x600/87CEEB/000000?text=Bob+1', isPrimary: true }
    ],
    compatibilityScore: 85,
    isActive: true,
    isOnline: Math.random() > 0.5,
    lastActive: new Date(Date.now() - Math.random() * 72 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'clara@test.com',
    name: 'Clara Dubois',
    age: 26,
    bio: 'Artiste et voyageuse 🎨 Je peins ce que je vois dans mes voyages. Amoureuse des couchers de soleil.',
    location: 'Montpellier, Occitanie',
    department: '34',
    region: 'Occitanie',
    profession: 'Artiste',
    interests: ['Art', 'Voyage', 'Peinture', 'Photographie'],
    photos: [
      { id: 'clara_1', url: 'https://via.placeholder.com/400x600/DDA0DD/000000?text=Clara+1', isPrimary: true },
      { id: 'clara_2', url: 'https://via.placeholder.com/400x600/DDA0DD/000000?text=Clara+2', isPrimary: false }
    ],
    compatibilityScore: 88,
    isActive: true,
    isOnline: Math.random() > 0.5,
    lastActive: new Date(Date.now() - Math.random() * 72 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'david@test.com',
    name: 'David Chen',
    age: 29,
    bio: 'Développeur créatif 👨‍💻 Le jour je code, le soir je compose de la musique. Toujours partant pour un bon film !',
    location: 'Toulouse, Occitanie',
    department: '31',
    region: 'Occitanie',
    profession: 'Développeur',
    interests: ['Programmation', 'Musique', 'Cinéma', 'Technologie'],
    photos: [
      { id: 'david_1', url: 'https://via.placeholder.com/400x600/98FB98/000000?text=David+1', isPrimary: true }
    ],
    compatibilityScore: 91,
    isActive: true,
    isOnline: Math.random() > 0.5,
    lastActive: new Date(Date.now() - Math.random() * 72 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'emma@test.com',
    name: 'Emma Rodriguez',
    age: 25,
    bio: 'Médecin et sportive ⚕️🏃‍♀️ Passionnée de trail et de médecine d\'urgence. La vie est une aventure !',
    location: 'Nice, Provence-Alpes-Côte d\'Azur',
    department: '06',
    region: 'Provence-Alpes-Côte d\'Azur',
    profession: 'Médecin',
    interests: ['Médecine', 'Sport', 'Trail', 'Nature'],
    photos: [
      { id: 'emma_1', url: 'https://via.placeholder.com/400x600/F0E68C/000000?text=Emma+1', isPrimary: true },
      { id: 'emma_2', url: 'https://via.placeholder.com/400x600/F0E68C/000000?text=Emma+2', isPrimary: false }
    ],
    compatibilityScore: 94,
    isActive: true,
    isOnline: Math.random() > 0.5,
    lastActive: new Date(Date.now() - Math.random() * 72 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'felix@test.com',
    name: 'Felix Andersson',
    age: 31,
    bio: 'Chef cuisinier 👨‍🍳 Spécialisé dans la cuisine nordique. J\'adore expérimenter avec les saveurs locales.',
    location: 'Bordeaux, Nouvelle-Aquitaine',
    department: '33',
    region: 'Nouvelle-Aquitaine',
    profession: 'Chef',
    interests: ['Cuisine', 'Gastronomie', 'Voyage', 'Culture'],
    photos: [
      { id: 'felix_1', url: 'https://via.placeholder.com/400x600/FFA07A/000000?text=Felix+1', isPrimary: true }
    ],
    compatibilityScore: 87,
    isActive: true,
    isOnline: Math.random() > 0.5,
    lastActive: new Date(Date.now() - Math.random() * 72 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'gabrielle@test.com',
    name: 'Gabrielle Moreau',
    age: 27,
    bio: 'Architecte passionnée 🏛️ Je dessine les espaces de demain. Fan de design durable et d\'éco-construction.',
    location: 'Nantes, Pays de la Loire',
    department: '44',
    region: 'Pays de la Loire',
    profession: 'Architecte',
    interests: ['Architecture', 'Design', 'Écologie', 'Art'],
    photos: [
      { id: 'gabrielle_1', url: 'https://via.placeholder.com/400x600/AFEEEE/000000?text=Gabrielle+1', isPrimary: true },
      { id: 'gabrielle_2', url: 'https://via.placeholder.com/400x600/AFEEEE/000000?text=Gabrielle+2', isPrimary: false }
    ],
    compatibilityScore: 89,
    isActive: true,
    isOnline: Math.random() > 0.5,
    lastActive: new Date(Date.now() - Math.random() * 72 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'hugo@test.com',
    name: 'Hugo Lefevre',
    age: 30,
    bio: 'Journaliste et globe-trotter 📰✈️ Je raconte les histoires du monde. Toujours à la recherche de la prochaine aventure.',
    location: 'Strasbourg, Grand Est',
    department: '67',
    region: 'Grand Est',
    profession: 'Journaliste',
    interests: ['Journalisme', 'Voyage', 'Culture', 'Histoire'],
    photos: [
      { id: 'hugo_1', url: 'https://via.placeholder.com/400x600/D3D3D3/000000?text=Hugo+1', isPrimary: true }
    ],
    compatibilityScore: 86,
    isActive: true,
    isOnline: Math.random() > 0.5,
    lastActive: new Date(Date.now() - Math.random() * 72 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'isabelle@test.com',
    name: 'Isabelle Martin',
    age: 28,
    bio: 'Psychologue et yogini 🧘‍♀️ J\'aide les gens à se connecter à eux-mêmes. Pratique quotidienne de méditation.',
    location: 'Marseille, Provence-Alpes-Côte d\'Azur',
    department: '13',
    region: 'Provence-Alpes-Côte d\'Azur',
    profession: 'Psychologue',
    interests: ['Psychologie', 'Yoga', 'Méditation', 'Bien-être'],
    photos: [
      { id: 'isabelle_1', url: 'https://via.placeholder.com/400x600/E6E6FA/000000?text=Isabelle+1', isPrimary: true },
      { id: 'isabelle_2', url: 'https://via.placeholder.com/400x600/E6E6FA/000000?text=Isabelle+2', isPrimary: false }
    ],
    compatibilityScore: 93,
    isActive: true,
    isOnline: Math.random() > 0.5,
    lastActive: new Date(Date.now() - Math.random() * 72 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'julien@test.com',
    name: 'Julien Rousseau',
    age: 33,
    bio: 'Ingénieur en énergies renouvelables 🌱 Passionné par l\'avenir de notre planète. Weekend = randonnée en montagne.',
    location: 'Grenoble, Auvergne-Rhône-Alpes',
    department: '38',
    region: 'Auvergne-Rhône-Alpes',
    profession: 'Ingénieur',
    interests: ['Écologie', 'Randonnée', 'Technologie', 'Nature'],
    photos: [
      { id: 'julien_1', url: 'https://via.placeholder.com/400x600/228B22/FFFFFF?text=Julien+1', isPrimary: true }
    ],
    compatibilityScore: 90,
    isActive: true,
    isOnline: Math.random() > 0.5,
    lastActive: new Date(Date.now() - Math.random() * 72 * 60 * 60 * 1000).toISOString()
  }
];

// 🎯 SYSTÈME DE PERSISTANCE SIMPLE
interface UserDiscoveryState {
  viewedProfiles: string[];
  interactions: Array<{
    profileId: string;
    action: 'like' | 'dislike' | 'super_like';
    timestamp: number;
  }>;
  lastResetTime: number;
  cycleCount: number;
}

class PersistentStorage {
  private static states: Map<string, UserDiscoveryState> = new Map();

  static async saveState(userId: string, state: UserDiscoveryState) {
    this.states.set(userId, state);
    console.log(`💾 État sauvegardé pour ${userId}:`, {
      interactions: state.interactions.length,
      cycle: state.cycleCount
    });
  }

  static async loadState(userId: string): Promise<UserDiscoveryState> {
    const existing = this.states.get(userId);
    if (existing) return existing;

    const defaultState: UserDiscoveryState = {
      viewedProfiles: [],
      interactions: [],
      lastResetTime: Date.now(),
      cycleCount: 1
    };

    this.states.set(userId, defaultState);
    console.log(`🆕 Nouvel état créé pour ${userId}`);
    return defaultState;
  }

  static async clearState(userId: string) {
    this.states.delete(userId);
    console.log(`🗑️ État effacé pour ${userId}`);
  }
}

// 🎯 ALGORITHME DE DÉCOUVERTE COMPLET ET AUTONOME
class CompleteDiscoveryAlgorithm {
  
  // Récupérer les profils vus
  static async getViewedProfiles(userId: string): Promise<string[]> {
    const state = await PersistentStorage.loadState(userId);
    return state.viewedProfiles;
  }

  // Marquer un profil comme vu avec interaction optionnelle
  static async markProfileAsViewed(userId: string, profileId: string, action?: 'like' | 'dislike' | 'super_like') {
    const state = await PersistentStorage.loadState(userId);
    
    // Ajouter aux profils vus
    if (!state.viewedProfiles.includes(profileId)) {
      state.viewedProfiles.push(profileId);
    }

    // Enregistrer l'interaction si fournie
    if (action) {
      state.interactions.push({
        profileId,
        action,
        timestamp: Date.now()
      });
      console.log(`🎯 Interaction ${action} enregistrée: ${userId} → ${profileId}`);
    }

    await PersistentStorage.saveState(userId, state);
  }

  // Reset des profils vus
  static async resetViewedProfiles(userId: string, type: 'full' | 'smart' = 'full') {
    const state = await PersistentStorage.loadState(userId);
    
    if (type === 'full') {
      // Reset complet
      state.viewedProfiles = [];
      state.cycleCount++;
      console.log(`✅ Reset complet pour ${userId} - Cycle ${state.cycleCount}`);
    } else {
      // Reset intelligent : garder les interactions récentes (24h)
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      const recentInteractions = state.interactions.filter(i => i.timestamp > oneDayAgo);
      const recentProfileIds = recentInteractions.map(i => i.profileId);
      
      // Retirer de viewedProfiles tout sauf les récents
      const originalCount = state.viewedProfiles.length;
      state.viewedProfiles = state.viewedProfiles.filter(id => recentProfileIds.includes(id));
      
      console.log(`🔄 Reset intelligent pour ${userId}: ${originalCount - state.viewedProfiles.length} profils libérés`);
    }
    
    state.lastResetTime = Date.now();
    await PersistentStorage.saveState(userId, state);
  }

  // Obtenir les profils avec système de cooldown
  static async getAvailableProfilesWithCooldown(userId: string, filters?: any) {
    const state = await PersistentStorage.loadState(userId);
    const now = Date.now();
    const cooldownPeriod = 24 * 60 * 60 * 1000; // 24h en millisecondes

    // Profils en cooldown (interagi dans les dernières 24h)
    const recentInteractionIds = state.interactions
      .filter(i => now - i.timestamp < cooldownPeriod)
      .map(i => i.profileId);

    // Filtrer les profils disponibles
    let availableProfiles = EXTENDED_PROFILES_DB.filter(profile => 
      profile.isActive && 
      profile.id !== userId && 
      !recentInteractionIds.includes(profile.id) // Exclure les cooldowns
    );

    // Appliquer les filtres
    if (filters) {
      if (filters.minAge) {
        availableProfiles = availableProfiles.filter(p => p.age >= filters.minAge);
      }
      if (filters.maxAge) {
        availableProfiles = availableProfiles.filter(p => p.age <= filters.maxAge);
      }
      if (filters.interests && filters.interests.length > 0) {
        availableProfiles = availableProfiles.filter(p => 
          p.interests.some(interest => filters.interests.includes(interest))
        );
      }
    }

    // Boost et tri
    const boostedProfiles = availableProfiles.map(profile => {
      let boostedScore = profile.compatibilityScore;
      
      // Boost aléatoire léger pour varier l'ordre
      boostedScore += Math.random() * 5;
      
      // Boost pour profils en ligne
      if (profile.isOnline) boostedScore += 10;
      
      // Boost pour nouveaux profils (simulé)
      if (Math.random() > 0.7) boostedScore += 8; // 30% de chance d'être "nouveau"
      
      return { ...profile, boostedScore };
    });

    // Trier par score boosté
    boostedProfiles.sort((a, b) => b.boostedScore - a.boostedScore);

    return boostedProfiles;
  }

  // Vérification des matches
  static async checkForMatches(userId: string, targetId: string, action: 'like' | 'super_like'): Promise<boolean> {
    if (action !== 'like' && action !== 'super_like') return false;

    // Vérifier si l'autre utilisateur a liké en retour
    const targetState = await PersistentStorage.loadState(targetId);
    const reciprocalLike = targetState.interactions.find(i => 
      i.profileId === userId && (i.action === 'like' || i.action === 'super_like')
    );

    if (reciprocalLike) {
      console.log(`🎉 MATCH détecté entre ${userId} et ${targetId}!`);
      await this.createMatch(userId, targetId);
      return true;
    }

    return false;
  }

  // Création d'un match
  static async createMatch(user1Id: string, user2Id: string) {
    const matchId = `match_${Date.now()}_${user1Id}_${user2Id}`;
    console.log(`💕 Match créé: ${matchId}`);
    // En production, sauvegarder en base de données
  }

  // Diagnostic avancé
  static async getAdvancedDiagnostic(userId: string) {
    const state = await PersistentStorage.loadState(userId);
    const now = Date.now();
    const cooldownPeriod = 24 * 60 * 60 * 1000;

    const totalProfiles = EXTENDED_PROFILES_DB.filter(p => p.isActive && p.id !== userId).length;
    const recentInteractions = state.interactions.filter(i => now - i.timestamp < cooldownPeriod);
    const cooldownProfiles = recentInteractions.length;
    const availableProfiles = await this.getAvailableProfilesWithCooldown(userId);

    // Calculer le prochain profil disponible
    const oldestCooldown = recentInteractions
      .sort((a, b) => a.timestamp - b.timestamp)[0];
    const nextAvailableIn = oldestCooldown ? 
      Math.max(0, (oldestCooldown.timestamp + cooldownPeriod) - now) : 0;

    return {
      totalProfiles,
      availableProfiles: availableProfiles.length,
      cooldownProfiles,
      totalInteractions: state.interactions.length,
      cycleCount: state.cycleCount,
      nextAvailableIn: Math.ceil(nextAvailableIn / (60 * 60 * 1000)), // en heures
      timeSinceLastReset: Math.ceil((now - state.lastResetTime) / (60 * 60 * 1000)), // en heures
      needsReset: availableProfiles.length < 3,
      needsMoreProfiles: totalProfiles < 15,
      recentStats: {
        likes: recentInteractions.filter(i => i.action === 'like').length,
        dislikes: recentInteractions.filter(i => i.action === 'dislike').length,
        superLikes: recentInteractions.filter(i => i.action === 'super_like').length,
      }
    };
  }

  // Recommandations intelligentes
  static async getRecommendedProfiles(userId: string, limit: number = 10) {
    // 1. Obtenir les profils avec cooldown
    let profiles = await this.getAvailableProfilesWithCooldown(userId);
    
    console.log(`📊 Profils disponibles (après cooldown) pour ${userId}:`, profiles.length);

    // 2. Stratégies si pas assez de profils
    if (profiles.length < 5) {
      console.log('⚠️ Peu de profils disponibles, application de stratégies...');
      
      // Stratégie 1: Reset intelligent automatique
      if (profiles.length <= 2) {
        console.log('🔄 Reset intelligent automatique...');
        await this.resetViewedProfiles(userId, 'smart');
        profiles = await this.getAvailableProfilesWithCooldown(userId);
      }
      
      // Stratégie 2: Générer plus de profils (simulation)
      if (profiles.length < 3) {
        console.log('🧪 Génération de profils supplémentaires simulée...');
        // En prod, ici on irait chercher plus de profils en base
      }
    }

    // 3. Mélanger légèrement tout en gardant l'ordre par score
    const shuffled = profiles
      .slice(0, Math.min(20, profiles.length)) // Top 20
      .sort(() => Math.random() - 0.4); // Mélange léger

    return shuffled.slice(0, limit);
  }
}

// 🎯 API GET - Chargement des profils
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const userId = session.user.email;
    const url = new URL(request.url);
    const reset = url.searchParams.get('reset') === 'true';
    const resetType = url.searchParams.get('resetType') as 'full' | 'smart' || 'smart';
    const diagnostic = url.searchParams.get('diagnostic') === 'true';

    console.log(`📥 Requête découverte pour ${userId}:`, { reset, resetType, diagnostic });

    // Reset si demandé
    if (reset) {
      console.log(`🔄 Reset ${resetType} demandé pour ${userId}`);
      await CompleteDiscoveryAlgorithm.resetViewedProfiles(userId, resetType);
    }

    // Diagnostic complet si demandé
    if (diagnostic) {
      const diagnosticInfo = await CompleteDiscoveryAlgorithm.getAdvancedDiagnostic(userId);
      console.log('📊 Diagnostic avancé:', diagnosticInfo);
      return NextResponse.json({
        success: true,
        diagnostic: diagnosticInfo,
        profiles: []
      });
    }

    // Obtenir les profils recommandés
    const profiles = await CompleteDiscoveryAlgorithm.getRecommendedProfiles(userId, 10);
    
    // Diagnostic automatique
    const diagnosticInfo = await CompleteDiscoveryAlgorithm.getAdvancedDiagnostic(userId);
    
    console.log(`✅ ${profiles.length} profils retournés pour ${userId}`);

    // Messages intelligents selon la situation
    let message = 'Profils disponibles trouvés.';
    if (profiles.length === 0) {
      message = diagnosticInfo.cooldownProfiles > 0 ? 
        `Tous les profils sont en cooldown. Prochain disponible dans ${diagnosticInfo.nextAvailableIn}h.` :
        'Aucun nouveau profil disponible. Utilisez le reset pour revoir des profils.';
    } else if (profiles.length < 5) {
      message = `${profiles.length} profils disponibles. ${diagnosticInfo.cooldownProfiles} en cooldown.`;
    }

    return NextResponse.json({
      success: true,
      profiles,
      diagnostic: diagnosticInfo,
      suggestions: {
        needsReset: diagnosticInfo.needsReset,
        needsMoreProfiles: diagnosticInfo.needsMoreProfiles,
        canSmartReset: diagnosticInfo.cooldownProfiles > 5,
        canFullReset: diagnosticInfo.timeSinceLastReset > 24, // Peut faire un reset complet après 24h
        message
      },
      metadata: {
        algorithm: 'complete_discovery_v1',
        cycle: diagnosticInfo.cycleCount,
        totalInteractions: diagnosticInfo.totalInteractions
      }
    });

  } catch (error) {
    console.error('❌ Erreur API discover:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

// 🎯 API POST - Gestion des interactions
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const userId = session.user.email;
    const { profileId, action } = await request.json();

    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID manquant' }, { status: 400 });
    }

    // Actions supportées
    if (action === 'view') {
      await CompleteDiscoveryAlgorithm.markProfileAsViewed(userId, profileId);
      console.log(`👁️ Profil ${profileId} marqué comme vu pour ${userId}`);
      
      return NextResponse.json({
        success: true,
        message: 'Profil marqué comme vu'
      });
    }

    if (['like', 'dislike', 'super_like'].includes(action)) {
      await CompleteDiscoveryAlgorithm.markProfileAsViewed(userId, profileId, action);
      console.log(`💝 Action ${action} pour profil ${profileId} par ${userId}`);

      // Vérifier les matches pour les likes
      let isMatch = false;
      if (action === 'like' || action === 'super_like') {
        isMatch = await CompleteDiscoveryAlgorithm.checkForMatches(userId, profileId, action);
      }

      return NextResponse.json({
        success: true,
        isMatch,
        action,
        message: isMatch ? 'Match créé !' : `Action ${action} enregistrée`
      });
    }

    return NextResponse.json({ error: 'Action invalide' }, { status: 400 });

  } catch (error) {
    console.error('❌ Erreur POST discover:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

// 🎯 API PATCH - Gestion d'état utilisateur
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const userId = session.user.email;
    const { action } = await request.json();

    if (action === 'clear_state') {
      await PersistentStorage.clearState(userId);
      console.log(`🗑️ État complètement effacé pour ${userId}`);
      
      return NextResponse.json({
        success: true,
        message: 'État utilisateur effacé'
      });
    }

    if (action === 'get_stats') {
      const diagnostic = await CompleteDiscoveryAlgorithm.getAdvancedDiagnostic(userId);
      return NextResponse.json({
        success: true,
        stats: diagnostic
      });
    }

    return NextResponse.json({ error: 'Action invalide' }, { status: 400 });

  } catch (error) {
    console.error('❌ Erreur PATCH discover:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}