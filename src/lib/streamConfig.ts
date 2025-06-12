// src/lib/streamConfig.ts - Utilitaire de vérification Stream
export interface StreamConfig {
    apiKey: string;
    apiSecret: string;
    isConfigured: boolean;
    missingVars: string[];
  }
  
  export function getStreamConfig(): StreamConfig {
    const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
    const apiSecret = process.env.STREAM_API_SECRET;
    
    const missingVars: string[] = [];
    
    if (!apiKey) missingVars.push('NEXT_PUBLIC_STREAM_API_KEY');
    if (!apiSecret) missingVars.push('STREAM_API_SECRET');
    
    return {
      apiKey: apiKey || '',
      apiSecret: apiSecret || '',
      isConfigured: missingVars.length === 0,
      missingVars
    };
  }
  
  export function logStreamStatus(): void {
    const config = getStreamConfig();
    
    if (config.isConfigured) {
      console.log('✅ [STREAM] Configuration complète');
      console.log('🔑 [STREAM] API Key:', config.apiKey.substring(0, 8) + '...');
    } else {
      console.log('⚠️ [STREAM] Configuration incomplète');
      console.log('❌ [STREAM] Variables manquantes:', config.missingVars.join(', '));
    }
  }
  
  // Types pour Stream
  export interface StreamUser {
    id: string;
    name: string;
    image?: string;
    email?: string;
    age?: number;
    bio?: string;
    location?: string;
    profession?: string;
    gender?: string;
    isOnline?: boolean;
    lastSeen?: Date | null;
  }
  
  // Fonction utilitaire pour créer un client Stream sécurisé
  export async function createStreamClient() {
    const config = getStreamConfig();
    
    if (!config.isConfigured) {
      throw new Error(`Stream non configuré. Variables manquantes: ${config.missingVars.join(', ')}`);
    }
    
    try {
      const { StreamChat } = await import('stream-chat');
      
      const client = StreamChat.getInstance(config.apiKey, config.apiSecret);
      console.log('✅ [STREAM] Client serveur créé avec succès');
      
      return client;
    } catch (error) {
      console.error('❌ [STREAM] Erreur création client:', error);
      throw new Error('Impossible de créer le client Stream. Vérifiez l\'installation : npm install stream-chat');
    }
  }
  
  // Fonction pour créer un token utilisateur Stream
  export async function createUserToken(userId: string): Promise<string> {
    const client = await createStreamClient();
    
    try {
      const token = client.createToken(userId);
      console.log(`✅ [STREAM] Token créé pour utilisateur: ${userId}`);
      
      return token;
    } catch (error) {
      console.error('❌ [STREAM] Erreur création token:', error);
      throw new Error('Impossible de créer le token utilisateur');
    }
  }
  
  // Fonction pour créer ou récupérer un utilisateur Stream
  export async function upsertStreamUser(user: StreamUser): Promise<void> {
    const client = await createStreamClient();
    
    try {
      await client.upsertUser({
        id: user.id,
        name: user.name,
        image: user.image,
        // Ajouter d'autres propriétés personnalisées si nécessaire
        role: 'user'
      });
      
      console.log(`✅ [STREAM] Utilisateur upsert: ${user.name} (${user.id})`);
    } catch (error) {
      console.error('❌ [STREAM] Erreur upsert utilisateur:', error);
      throw new Error('Impossible de créer/mettre à jour l\'utilisateur Stream');
    }
  }