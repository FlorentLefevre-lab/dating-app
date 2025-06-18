// scripts/test-redis.js - Version corrigée pour .env.local
const Redis = require('ioredis')
const fs = require('fs')
const path = require('path')

// Fonction pour charger les fichiers .env dans l'ordre de priorité Next.js
function loadEnvFiles() {
  const envFiles = [
    '.env.local',        // Priorité 1 - développement local
    '.env.development',  // Priorité 2 - développement
    '.env',             // Priorité 3 - général
  ]
  
  const env = {}
  
  for (const envFile of envFiles) {
    const envPath = path.join(__dirname, '..', envFile)
    
    try {
      const data = fs.readFileSync(envPath, 'utf8')
      const lines = data.split('\n')
      
      console.log(`✅ Chargement: ${envFile}`)
      
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=')
          if (key && valueParts.length > 0) {
            // Ne pas écraser si la variable existe déjà (priorité)
            if (!env[key.trim()]) {
              env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
            }
          }
        }
      }
    } catch (error) {
      console.log(`⚠️ ${envFile} non trouvé`)
    }
  }
  
  return env
}

async function testRedis() {
  console.log('🔍 Test de connexion Redis...\n')
  
  // Charger les variables d'environnement comme Next.js
  const env = loadEnvFiles()
  
  console.log('📋 Variables Redis détectées:')
  console.log('  REDIS_HOST:', env.REDIS_HOST || 'localhost (défaut)')
  console.log('  REDIS_PORT:', env.REDIS_PORT || '6379 (défaut)')
  console.log('  REDIS_PASSWORD:', env.REDIS_PASSWORD ? '***masqué***' : 'aucun')
  console.log('  REDIS_DB:', env.REDIS_DB || '0 (défaut)')
  console.log('')

  const redis = new Redis({
    host: env.REDIS_HOST || 'localhost',
    port: parseInt(env.REDIS_PORT || '6379'),
    password: env.REDIS_PASSWORD || undefined,
    db: parseInt(env.REDIS_DB || '0'),
    connectTimeout: 5000,
    lazyConnect: true,
  })

  redis.on('connect', () => {
    console.log('✅ Redis: Connexion établie')
  })

  redis.on('ready', () => {
    console.log('🚀 Redis: Prêt à recevoir des commandes')
  })

  redis.on('error', (err) => {
    console.error('❌ Redis: Erreur de connexion:', err.message)
  })

  redis.on('close', () => {
    console.log('🔌 Redis: Connexion fermée')
  })

  try {
    console.log('🔌 Tentative de connexion...')
    await redis.connect()
    
    console.log('📡 Test ping...')
    const pong = await redis.ping()
    console.log('✅ Ping Redis:', pong)
    
    console.log('💾 Test set/get...')
    await redis.set('test:connection', 'Hello Redis from Node.js!')
    const value = await redis.get('test:connection')
    console.log('📦 Valeur récupérée:', value)
    
    console.log('🧹 Nettoyage...')
    await redis.del('test:connection')
    
    console.log('\n🎉 Redis fonctionne parfaitement!')
    console.log('✅ Votre cache Redis est prêt pour Next.js!')
    
  } catch (error) {
    console.error('\n❌ Erreur Redis:', error.message)
    console.log('\n🔧 Solutions:')
    console.log('1. 🐳 Démarrer Redis: docker-compose up -d redis')
    console.log('2. 📝 Vérifier .env.local avec les bonnes variables')
    console.log('3. 🔍 Vérifier que Redis écoute sur le port configuré')
  } finally {
    await redis.disconnect()
  }
}

// Afficher le contenu des fichiers .env pour debug
function showEnvFiles() {
  console.log('📁 Fichiers d\'environnement disponibles:\n')
  
  const envFiles = ['.env.local', '.env.development', '.env']
  
  for (const envFile of envFiles) {
    const envPath = path.join(__dirname, '..', envFile)
    
    try {
      const data = fs.readFileSync(envPath, 'utf8')
      console.log(`📄 ${envFile}:`)
      
      // Afficher seulement les lignes Redis (masquer les secrets)
      const lines = data.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('REDIS_')) {
          if (trimmed.includes('PASSWORD') && trimmed.includes('=')) {
            const [key] = trimmed.split('=')
            console.log(`  ${key}=***masqué***`)
          } else {
            console.log(`  ${trimmed}`)
          }
        }
      }
      console.log('')
    } catch (error) {
      console.log(`❌ ${envFile}: non trouvé\n`)
    }
  }
}

async function runTests() {
  showEnvFiles()
  await testRedis()
}

runTests().catch(console.error)