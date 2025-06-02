// src/utils/profileDiagnostic.ts
// Outil pour diagnostiquer pourquoi il n'y a plus de profils

interface DiagnosticResult {
    totalProfiles: number;
    availableProfiles: number;
    viewedProfiles: number;
    hiddenProfiles: number;
    issues: string[];
    recommendations: string[];
  }
  
  interface ProfileFilters {
    minAge?: number;
    maxAge?: number;
    maxDistance?: number;
    interests?: string[];
    profession?: string;
  }
  
  export class ProfileDiagnostic {
    
    // Analyser l'état actuel du système
    static async diagnoseProfileAvailability(userId: string): Promise<DiagnosticResult> {
      const result: DiagnosticResult = {
        totalProfiles: 0,
        availableProfiles: 0,
        viewedProfiles: 0,
        hiddenProfiles: 0,
        issues: [],
        recommendations: []
      };
  
      try {
        // 1. Compter tous les profils en base
        const totalProfilesResponse = await fetch('/api/profiles/count');
        const totalData = await totalProfilesResponse.json();
        result.totalProfiles = totalData.count || 0;
  
        // 2. Compter les profils déjà vus
        const viewedResponse = await fetch(`/api/user/${userId}/viewed-profiles`);
        const viewedData = await viewedResponse.json();
        result.viewedProfiles = viewedData.count || 0;
  
        // 3. Compter les profils cachés/bloqués
        const hiddenResponse = await fetch(`/api/user/${userId}/hidden-profiles`);
        const hiddenData = await hiddenResponse.json();
        result.hiddenProfiles = hiddenData.count || 0;
  
        // 4. Calculer les profils disponibles
        result.availableProfiles = result.totalProfiles - result.viewedProfiles - result.hiddenProfiles;
  
        // 5. Analyser les problèmes
        this.analyzeIssues(result);
  
        // 6. Générer des recommandations
        this.generateRecommendations(result);
  
      } catch (error) {
        console.error('Erreur diagnostic:', error);
        result.issues.push('Erreur lors du diagnostic');
      }
  
      return result;
    }
  
    private static analyzeIssues(result: DiagnosticResult) {
      // Base de données trop petite
      if (result.totalProfiles < 50) {
        result.issues.push(`Base de données limitée: seulement ${result.totalProfiles} profils`);
      }
  
      // Trop de profils vus
      if (result.viewedProfiles > result.totalProfiles * 0.8) {
        result.issues.push(`${result.viewedProfiles} profils déjà vus (${Math.round(result.viewedProfiles/result.totalProfiles*100)}%)`);
      }
  
      // Trop de profils cachés
      if (result.hiddenProfiles > result.totalProfiles * 0.2) {
        result.issues.push(`${result.hiddenProfiles} profils cachés/bloqués`);
      }
  
      // Plus de profils disponibles
      if (result.availableProfiles <= 0) {
        result.issues.push('Aucun nouveau profil disponible');
      }
  
      // Profils disponibles très faibles
      if (result.availableProfiles < 5 && result.availableProfiles > 0) {
        result.issues.push(`Seulement ${result.availableProfiles} profils disponibles`);
      }
    }
  
    private static generateRecommendations(result: DiagnosticResult) {
      // Recommandations basées sur les problèmes identifiés
      if (result.totalProfiles < 50) {
        result.recommendations.push('Ajouter plus de profils en base de données');
        result.recommendations.push('Importer des profils de test ou demo');
      }
  
      if (result.viewedProfiles > result.totalProfiles * 0.8) {
        result.recommendations.push('Implémenter un reset intelligent des profils vus');
        result.recommendations.push('Permettre de revoir les profils après X jours');
      }
  
      if (result.hiddenProfiles > result.totalProfiles * 0.2) {
        result.recommendations.push('Réviser les critères de filtrage');
        result.recommendations.push('Proposer d\'élargir les critères de recherche');
      }
  
      if (result.availableProfiles <= 5) {
        result.recommendations.push('Expansion géographique des résultats');
        result.recommendations.push('Relâcher les critères de compatibilité');
        result.recommendations.push('Reset automatique après épuisement');
      }
    }
  
    // Suggestions pour améliorer l'algorithme
    static async getAlgorithmSuggestions(userId: string): Promise<ProfileFilters> {
      try {
        // Analyser les préférences de l'utilisateur
        const preferencesResponse = await fetch(`/api/user/${userId}/preferences`);
        const preferences = await preferencesResponse.json();
  
        // Analyser les likes/dislikes historiques
        const behaviorResponse = await fetch(`/api/user/${userId}/behavior-analysis`);
        const behavior = await behaviorResponse.json();
  
        // Générer des suggestions d'assouplissement
        const suggestions: ProfileFilters = {};
  
        // Élargir la tranche d'âge si trop restrictive
        if (preferences.maxAge - preferences.minAge < 10) {
          suggestions.minAge = Math.max(18, preferences.minAge - 2);
          suggestions.maxAge = Math.min(65, preferences.maxAge + 2);
        }
  
        // Élargir la distance si pas assez de résultats
        if (preferences.maxDistance < 50) {
          suggestions.maxDistance = preferences.maxDistance + 25;
        }
  
        // Assouplir les critères d'intérêts
        if (preferences.interests?.length > 3) {
          suggestions.interests = preferences.interests.slice(0, 2); // Garder seulement les 2 plus importants
        }
  
        return suggestions;
  
      } catch (error) {
        console.error('Erreur suggestions algorithme:', error);
        return {};
      }
    }
  
    // Générer des profils de test si nécessaire
    static async generateTestProfiles(count: number = 20): Promise<any[]> {
      const testProfiles = [];
      
      const names = [
        'Sophie Moreau', 'Lucas Dubois', 'Emma Leroy', 'Hugo Martin', 'Chloé Bernard',
        'Nathan Petit', 'Léa Durand', 'Maxime Rousseau', 'Manon Fournier', 'Antoine Bonnet',
        'Camille Girard', 'Théo Morel', 'Jade Lambert', 'Enzo Lefebvre', 'Sarah Roux',
        'Tom Garcia', 'Inès Mercier', 'Paul Barbier', 'Lola Brun', 'Arthur Faure'
      ];
  
      const bios = [
        'Passionné de voyage et de photographie 📸',
        'Amoureuse de la nature et du sport en plein air 🏔️',
        'Développeur le jour, chef cuisinier le soir 👨‍💻🍳',
        'Artiste dans l\'âme, toujours en quête de beauté ✨',
        'Entrepreneur passionné de tech et d\'innovation 🚀',
        'Médecin engagé, voyageur dans l\'âme 🌍',
        'Professeure qui adore transmettre sa passion 📚',
        'Musicien amateur et mélomane invétéré 🎵',
        'Sportive accomplie, toujours prête pour un défi 💪',
        'Designer créatif avec un goût pour l\'esthétique 🎨'
      ];
  
      const locations = [
        'Paris, Île-de-France', 'Lyon, Auvergne-Rhône-Alpes', 'Marseille, Provence-Alpes-Côte d\'Azur',
        'Toulouse, Occitanie', 'Nice, Provence-Alpes-Côte d\'Azur', 'Nantes, Pays de la Loire',
        'Montpellier, Occitanie', 'Strasbourg, Grand Est', 'Bordeaux, Nouvelle-Aquitaine', 'Lille, Hauts-de-France'
      ];
  
      const interests = [
        'Voyage', 'Photographie', 'Cuisine', 'Sport', 'Musique', 'Cinéma', 'Lecture', 'Art',
        'Randonnée', 'Yoga', 'Danse', 'Théâtre', 'Mode', 'Technologie', 'Écologie'
      ];
  
      const professions = [
        'Ingénieur', 'Médecin', 'Professeur', 'Designer', 'Avocat', 'Entrepreneur',
        'Architecte', 'Journaliste', 'Pharmacien', 'Consultant', 'Artiste', 'Chef de projet'
      ];
  
      for (let i = 0; i < Math.min(count, names.length); i++) {
        const age = Math.floor(Math.random() * (35 - 22) + 22); // Age entre 22 et 35
        const userInterests = this.getRandomItems(interests, 3 + Math.floor(Math.random() * 3));
        
        testProfiles.push({
          id: `test_user_${Date.now()}_${i}`,
          name: names[i],
          age,
          bio: bios[i % bios.length],
          location: locations[i % locations.length],
          profession: professions[i % professions.length],
          interests: userInterests,
          photos: [
            {
              id: `photo_${i}_1`,
              url: `https://via.placeholder.com/400x600/random?text=${encodeURIComponent(names[i])}`,
              isPrimary: true
            }
          ],
          compatibilityScore: Math.floor(Math.random() * 30 + 70), // Score entre 70-100%
          createdAt: new Date().toISOString(),
          isTestProfile: true
        });
      }
  
      return testProfiles;
    }
  
    private static getRandomItems<T>(array: T[], count: number): T[] {
      const shuffled = [...array].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    }
  }
  
  // API Helper pour diagnostics
  export async function runFullDiagnostic(userId: string) {
    console.log('🔍 Début du diagnostic complet...');
    
    const diagnostic = await ProfileDiagnostic.diagnoseProfileAvailability(userId);
    console.log('📊 Résultats diagnostic:', diagnostic);
    
    if (diagnostic.availableProfiles <= 5) {
      console.log('⚠️ Peu de profils disponibles, analyse des suggestions...');
      const suggestions = await ProfileDiagnostic.getAlgorithmSuggestions(userId);
      console.log('💡 Suggestions d\'amélioration:', suggestions);
      
      if (diagnostic.totalProfiles < 50) {
        console.log('📝 Génération de profils de test...');
        const testProfiles = await ProfileDiagnostic.generateTestProfiles(20);
        console.log('✅ Profils de test générés:', testProfiles.length);
        return { diagnostic, suggestions, testProfiles };
      }
    }
    
    return { diagnostic, suggestions: null, testProfiles: null };
  }