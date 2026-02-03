// scripts/test-smtp.js - Test SMTP connection
require('dotenv').config({ path: '.env.local' });
const nodemailer = require('nodemailer');

async function testSMTP() {
  console.log('='.repeat(60));
  console.log('TEST SMTP - Flow Dating');
  console.log('='.repeat(60));

  // Afficher la configuration (masquer le mot de passe)
  console.log('\n📧 Configuration SMTP:');
  console.log('  Host:', process.env.SMTP_HOST || '(non défini)');
  console.log('  Port:', process.env.SMTP_PORT || '(non défini)');
  console.log('  User:', process.env.SMTP_USER || '(non défini)');
  console.log('  Pass:', process.env.SMTP_PASS ? '****' + process.env.SMTP_PASS.slice(-4) : '(non défini)');
  console.log('  From:', process.env.SMTP_FROM || '(non défini)');

  const port = parseInt(process.env.SMTP_PORT || '587');

  // Test avec différentes configurations
  const configs = [
    {
      name: 'Port 587 + STARTTLS',
      config: {
        host: process.env.SMTP_HOST,
        port: 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
        connectionTimeout: 30000,
        greetingTimeout: 15000,
      }
    },
    {
      name: 'Port 465 + SSL implicite',
      config: {
        host: process.env.SMTP_HOST,
        port: 465,
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
        connectionTimeout: 30000,
        greetingTimeout: 15000,
      }
    },
    {
      name: 'Port 25 (non sécurisé)',
      config: {
        host: process.env.SMTP_HOST,
        port: 25,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
        connectionTimeout: 30000,
        greetingTimeout: 15000,
      }
    }
  ];

  for (const { name, config } of configs) {
    console.log(`\n🔄 Test: ${name}...`);

    try {
      const transporter = nodemailer.createTransport(config);

      // Vérifier la connexion
      await transporter.verify();
      console.log(`   ✅ Connexion réussie avec ${name}!`);

      // Proposer d'envoyer un email de test
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const testEmail = await new Promise((resolve) => {
        rl.question('\n📬 Entrez votre email pour recevoir un test (ou appuyez sur Entrée pour passer): ', (answer) => {
          rl.close();
          resolve(answer.trim());
        });
      });

      if (testEmail) {
        console.log(`\n📤 Envoi d'un email de test à ${testEmail}...`);

        const info = await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: testEmail,
          subject: '🧪 Test SMTP - Flow Dating',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #ec4899;">✅ Test SMTP réussi!</h1>
              <p>Cet email a été envoyé depuis votre serveur local Flow Dating.</p>
              <p><strong>Configuration utilisée:</strong></p>
              <ul>
                <li>Host: ${config.host}</li>
                <li>Port: ${config.port}</li>
                <li>Sécurisé: ${config.secure ? 'Oui (SSL)' : 'Non (STARTTLS)'}</li>
              </ul>
              <p style="color: #666; margin-top: 30px; font-size: 12px;">
                Flow Dating - ${new Date().toLocaleString('fr-FR')}
              </p>
            </div>
          `,
        });

        console.log(`   ✅ Email envoyé! Message ID: ${info.messageId}`);
      }

      // Sortir après un test réussi
      console.log('\n' + '='.repeat(60));
      console.log('✅ CONFIGURATION SMTP FONCTIONNELLE');
      console.log('='.repeat(60));
      console.log(`\nUtilisez ces paramètres dans .env.local:`);
      console.log(`  SMTP_HOST=${config.host}`);
      console.log(`  SMTP_PORT=${config.port}`);
      console.log(`  # secure=${config.secure} est déterminé automatiquement par le port`);
      process.exit(0);

    } catch (error) {
      console.log(`   ❌ Échec: ${error.message}`);
      if (error.code) console.log(`      Code: ${error.code}`);
      if (error.responseCode) console.log(`      Response Code: ${error.responseCode}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('❌ AUCUNE CONFIGURATION SMTP N\'A FONCTIONNÉ');
  console.log('='.repeat(60));
  console.log('\n💡 Vérifiez:');
  console.log('   1. Les identifiants SMTP_USER et SMTP_PASS sont corrects');
  console.log('   2. L\'adresse email existe bien chez Infomaniak');
  console.log('   3. Le mot de passe n\'a pas expiré');
  console.log('   4. Il n\'y a pas de restriction IP chez Infomaniak');
  console.log('\n   Pour Infomaniak, connectez-vous à:');
  console.log('   https://manager.infomaniak.com/');
  console.log('   > Hébergement Web > Votre domaine > Emails > Comptes email');
  process.exit(1);
}

testSMTP();
