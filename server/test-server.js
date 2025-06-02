// test-server.js - Test du serveur Socket.IO
const { io: Client } = require('socket.io-client');

const SERVER_URL = 'http://localhost:3001';

console.log('🧪 Test du serveur Socket.IO...');

// Test 1: Connexion HTTP
async function testHttpHealth() {
  try {
    const response = await fetch(`${SERVER_URL}/health`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Test HTTP: Serveur en ligne');
      console.log('   Uptime:', Math.round(data.uptime), 'secondes');
      console.log('   Version Node.js:', data.version);
      return true;
    } else {
      console.log('❌ Test HTTP: Serveur inaccessible');
      return false;
    }
  } catch (error) {
    console.log('❌ Test HTTP: Erreur de connexion:', error.message);
    return false;
  }
}

// Test 2: Connexion Socket.IO
function testSocketConnection() {
  return new Promise((resolve) => {
    console.log('🔌 Test connexion Socket.IO...');
    
    const socket = Client(SERVER_URL, {
      timeout: 5000,
      transports: ['websocket', 'polling']
    });

    let resolved = false;

    socket.on('connect', () => {
      console.log('✅ Socket connecté:', socket.id);
      
      // Test d'authentification
      socket.emit('auth', {
        userId: 'test-user-123',
        userName: 'Test User'
      });
    });

    socket.on('auth:success', (data) => {
      console.log('✅ Authentification réussie:', data.userId);
      
      // Test ping
      socket.emit('ping', (response) => {
        console.log('✅ Ping/Pong réussi - Latence:', Date.now() - response.latency, 'ms');
        
        socket.disconnect();
        if (!resolved) {
          resolved = true;
          resolve(true);
        }
      });
    });

    socket.on('auth:error', (error) => {
      console.log('❌ Erreur d\'authentification:', error.message);
      socket.disconnect();
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    });

    socket.on('connect_error', (error) => {
      console.log('❌ Erreur de connexion Socket:', error.message);
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket déconnecté:', reason);
    });

    // Timeout de sécurité
    setTimeout(() => {
      if (!resolved) {
        console.log('⏰ Timeout: Test Socket.IO trop long');
        socket.disconnect();
        resolved = true;
        resolve(false);
      }
    }, 10000);
  });
}

// Test 3: Test de charge basique
function testMultipleConnections() {
  return new Promise((resolve) => {
    console.log('👥 Test connexions multiples...');
    
    const connections = [];
    const targetConnections = 5;
    let connectedCount = 0;

    for (let i = 0; i < targetConnections; i++) {
      const socket = Client(SERVER_URL, {
        timeout: 5000
      });

      socket.on('connect', () => {
        connectedCount++;
        console.log(`   Connexion ${connectedCount}/${targetConnections}`);

        socket.emit('auth', {
          userId: `test-user-${i}`,
          userName: `Test User ${i}`
        });

        if (connectedCount === targetConnections) {
          console.log('✅ Toutes les connexions établies');
          
          // Déconnecter toutes les connexions
          connections.forEach(s => s.disconnect());
          
          setTimeout(() => {
            resolve(true);
          }, 1000);
        }
      });

      socket.on('connect_error', () => {
        console.log(`❌ Échec connexion ${i + 1}`);
        if (connectedCount === 0) {
          resolve(false);
        }
      });

      connections.push(socket);
    }

    // Timeout
    setTimeout(() => {
      if (connectedCount < targetConnections) {
        console.log(`⏰ Timeout: Seulement ${connectedCount}/${targetConnections} connexions`);
        connections.forEach(s => s.disconnect());
        resolve(false);
      }
    }, 15000);
  });
}

// Exécuter tous les tests
async function runAllTests() {
  console.log('🚀 Début des tests...\n');

  try {
    // Test 1: HTTP
    const httpTest = await testHttpHealth();
    if (!httpTest) {
      console.log('\n❌ Tests interrompus: Serveur HTTP inaccessible');
      process.exit(1);
    }

    console.log(''); // Ligne vide

    // Test 2: Socket.IO
    const socketTest = await testSocketConnection();
    if (!socketTest) {
      console.log('\n❌ Tests interrompus: Socket.IO non fonctionnel');
      process.exit(1);
    }

    console.log(''); // Ligne vide

    // Test 3: Connexions multiples
    const multiTest = await testMultipleConnections();
    
    console.log('\n🎉 Résumé des tests:');
    console.log('   ✅ HTTP Health Check');
    console.log('   ✅ Connexion Socket.IO');
    console.log('   ✅ Authentification');
    console.log('   ✅ Ping/Pong');
    console.log(`   ${multiTest ? '✅' : '❌'} Connexions multiples`);
    
    if (multiTest) {
      console.log('\n🎯 Tous les tests réussis ! Serveur prêt pour la production.');
    } else {
      console.log('\n⚠️  Tests partiellement réussis. Vérifiez les performances.');
    }

  } catch (error) {
    console.error('\n💥 Erreur lors des tests:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Vérifier si le serveur est démarré
if (require.main === module) {
  runAllTests();
}