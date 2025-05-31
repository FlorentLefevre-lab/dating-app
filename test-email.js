const nodemailer = require('nodemailer')

const config = {
  EMAIL_SERVER_HOST: 'smtp.gmail.com',
  EMAIL_SERVER_PORT: 587,
  EMAIL_SERVER_USER: 'lefevre.florent@gmail.com',
  EMAIL_SERVER_PASSWORD: 'luvxjaopaeiggwuf',
  EMAIL_FROM: 'lefevre.florent@gmail.com'
}

const transporter = nodemailer.createTransport({
  host: config.EMAIL_SERVER_HOST,
  port: config.EMAIL_SERVER_PORT,
  secure: false,
  auth: {
    user: config.EMAIL_SERVER_USER,
    pass: config.EMAIL_SERVER_PASSWORD,
  },
})

async function testVerificationEmail() {
  try {
    const info = await transporter.sendMail({
      from: config.EMAIL_FROM,
      to: 'gaia.motiondesign@gmail.com',
      subject: '📧 Test vérification email - LoveApp',
      html: `
        <h1>Test email de vérification</h1>
        <p>Si vous recevez ceci, l'envoi d'email de vérification fonctionne !</p>
        <a href="http://localhost:3000/auth/verify-email?token=test123">Lien de test</a>
      `,
    })

    console.log('✅ Email de vérification envoyé:', info.messageId)
  } catch (error) {
    console.error('❌ Erreur:', error.message)
  }
}

testVerificationEmail()