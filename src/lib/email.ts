// lib/email.ts - Gestion des emails avec cache Redis
import nodemailer from 'nodemailer'
import { cache, emailCache } from './cache'

const transporter = nodemailer.createTransporter({
  host: process.env.EMAIL_SERVER_HOST,
  port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
})

export async function sendPasswordResetEmail(email: string, token: string): Promise<{ 
  success: boolean; 
  message?: string; 
}> {
  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: '🔒 Réinitialisation de votre mot de passe - LoveApp',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e91e63;">Réinitialisation de mot de passe</h2>
        
        <p>Bonjour,</p>
        
        <p>Vous avez demandé la réinitialisation de votre mot de passe sur <strong>LoveApp</strong>.</p>
        
        <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #e91e63; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Réinitialiser mon mot de passe
          </a>
        </div>
        
        <p><strong>Ce lien expire dans 1 heure.</strong></p>
        
        <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.</p>
        
        <hr style="margin: 30px 0; border: 1px solid #eee;">
        
        <p style="color: #666; font-size: 12px;">
          Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br>
          <a href="${resetUrl}">${resetUrl}</a>
        </p>
      </div>
    `,
  }

  try {
    await transporter.sendMail(mailOptions)
    await emailCache.set(email, token)
    
    console.log('📧 Email de réinitialisation envoyé à:', email)
    return { success: true, message: 'Email de réinitialisation envoyé avec succès' }
  } catch (error) {
    console.error('❌ Erreur envoi email:', error)
    return { success: false, message: 'Erreur lors de l\'envoi de l\'email' }
  }
}

export async function sendEmailVerification(email: string, token: string): Promise<{ 
  success: boolean; 
  message?: string; 
}> {
  const verifyUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: '📧 Confirmez votre adresse email - LoveApp',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e91e63;">Bienvenue sur LoveApp ! 💕</h2>
        
        <p>Bonjour,</p>
        
        <p>Merci de vous être inscrit(e) sur <strong>LoveApp</strong> !</p>
        
        <p>Pour commencer à utiliser votre compte, veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous :</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" 
             style="background-color: #e91e63; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Confirmer mon email
          </a>
        </div>
        
        <p><strong>Ce lien expire dans 24 heures.</strong></p>
        
        <p>Si vous n'avez pas créé de compte sur LoveApp, vous pouvez ignorer cet email.</p>
        
        <hr style="margin: 30px 0; border: 1px solid #eee;">
        
        <p style="color: #666; font-size: 12px;">
          Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br>
          <a href="${verifyUrl}">${verifyUrl}</a>
        </p>
      </div>
    `,
  }

  try {
    await transporter.sendMail(mailOptions)
    await cache.set(`verification:${email}`, token, { prefix: 'email_tokens:', ttl: 86400 })
    
    console.log('📧 Email de vérification envoyé à:', email)
    return { success: true, message: 'Email de vérification envoyé avec succès' }
  } catch (error) {
    console.error('❌ Erreur envoi email vérification:', error)
    return { success: false, message: 'Erreur lors de l\'envoi de l\'email' }
  }
}

export async function validatePasswordResetToken(email: string, token: string): Promise<boolean> {
  try {
    const cachedToken = await emailCache.get(email)
    const isValid = cachedToken === token
    
    if (isValid) {
      await emailCache.delete(email)
      console.log('✅ Token de réinitialisation validé et supprimé:', email)
    } else {
      console.log('❌ Token de réinitialisation invalide:', email)
    }
    
    return isValid
  } catch (error) {
    console.error('❌ Erreur validation token:', error)
    return false
  }
}

export async function validateEmailVerificationToken(email: string, token: string): Promise<boolean> {
  try {
    const cachedToken = await cache.get(`verification:${email}`, { prefix: 'email_tokens:' })
    const isValid = cachedToken === token
    
    if (isValid) {
      await cache.delete(`verification:${email}`, { prefix: 'email_tokens:' })
      console.log('✅ Token de vérification email validé et supprimé:', email)
    } else {
      console.log('❌ Token de vérification email invalide:', email)
    }
    
    return isValid
  } catch (error) {
    console.error('❌ Erreur validation token email:', error)
    return false
  }
}
