// app/api/admin/email-marketing/unsubscribe/[token]/route.ts
// GET - Show unsubscribe page, POST - Process unsubscribe

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { unsubscribeByToken, oneClickUnsubscribe } from '@/lib/email/unsubscribe';

// GET - Return unsubscribe confirmation page or process one-click
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find email preference by token
    const preference = await prisma.emailPreference.findUnique({
      where: { unsubscribeToken: token },
    });

    if (!preference) {
      // Return error page
      return new NextResponse(
        generateHtmlPage('Lien invalide', 'Ce lien de desabonnement est invalide ou a expire.', false),
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // Check if already unsubscribed
    if (preference.unsubscribedAt) {
      return new NextResponse(
        generateHtmlPage(
          'Deja desabonne',
          `L'adresse ${preference.email} est deja desabonnee de nos communications marketing.`,
          true
        ),
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // Return confirmation page with form
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Se desabonner - Flow Dating</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      max-width: 480px;
      width: 100%;
      padding: 40px;
      text-align: center;
    }
    .logo { font-size: 32px; margin-bottom: 24px; }
    h1 { color: #1f2937; font-size: 24px; margin-bottom: 16px; }
    p { color: #6b7280; line-height: 1.6; margin-bottom: 24px; }
    .email {
      background: #f3f4f6;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 500;
      color: #374151;
      margin-bottom: 24px;
    }
    form { margin-top: 20px; }
    .reason {
      width: 100%;
      padding: 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 14px;
    }
    button {
      background: #ec4899;
      color: white;
      border: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
      width: 100%;
    }
    button:hover { background: #db2777; }
    .cancel {
      display: block;
      margin-top: 16px;
      color: #6b7280;
      text-decoration: none;
      font-size: 14px;
    }
    .cancel:hover { color: #374151; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">💌</div>
    <h1>Se desabonner</h1>
    <p>Vous souhaitez ne plus recevoir nos emails marketing ?</p>
    <div class="email">${preference.email}</div>
    <form method="POST">
      <select name="reason" class="reason">
        <option value="">Raison (optionnel)</option>
        <option value="too_many">Je recois trop d'emails</option>
        <option value="not_relevant">Le contenu ne m'interesse pas</option>
        <option value="found_partner">J'ai trouve quelqu'un</option>
        <option value="other">Autre raison</option>
      </select>
      <button type="submit">Confirmer le desabonnement</button>
    </form>
    <a href="${process.env.NEXT_PUBLIC_APP_URL || '/'}" class="cancel">Annuler et retourner sur Flow Dating</a>
  </div>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    console.error('Error displaying unsubscribe page:', error);
    return new NextResponse(
      generateHtmlPage('Erreur', 'Une erreur est survenue. Veuillez reessayer.', false),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

// POST - Process unsubscribe
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Check for one-click unsubscribe (RFC 8058)
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      const listUnsubscribe = formData.get('List-Unsubscribe');

      if (listUnsubscribe === 'One-Click') {
        // RFC 8058 one-click unsubscribe
        const success = await oneClickUnsubscribe(token);

        if (success) {
          return new NextResponse(
            generateHtmlPage('Desabonnement confirme', 'Vous avez ete desabonne avec succes.', true),
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        } else {
          return new NextResponse(
            generateHtmlPage('Erreur', 'Impossible de traiter votre demande.', false),
            { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 400 }
          );
        }
      }
    }

    // Regular form submission
    let reason: string | undefined;
    try {
      const formData = await request.formData();
      reason = formData.get('reason')?.toString();
    } catch {
      // Body already consumed or not form data
    }

    const success = await unsubscribeByToken(token, reason);

    if (success) {
      return new NextResponse(
        generateHtmlPage(
          'Desabonnement confirme',
          'Vous ne recevrez plus nos emails marketing. Vous pouvez vous reabonner a tout moment depuis les parametres de votre compte.',
          true
        ),
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    } else {
      return new NextResponse(
        generateHtmlPage('Erreur', 'Ce lien de desabonnement est invalide ou a expire.', false),
        { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 400 }
      );
    }
  } catch (error) {
    console.error('Error processing unsubscribe:', error);
    return new NextResponse(
      generateHtmlPage('Erreur', 'Une erreur est survenue. Veuillez reessayer.', false),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 500 }
    );
  }
}

function generateHtmlPage(title: string, message: string, success: boolean): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Flow Dating</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      max-width: 480px;
      width: 100%;
      padding: 40px;
      text-align: center;
    }
    .icon { font-size: 48px; margin-bottom: 24px; }
    h1 { color: ${success ? '#059669' : '#dc2626'}; font-size: 24px; margin-bottom: 16px; }
    p { color: #6b7280; line-height: 1.6; }
    .link {
      display: inline-block;
      margin-top: 24px;
      color: #ec4899;
      text-decoration: none;
      font-weight: 500;
    }
    .link:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${success ? '✅' : '❌'}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL || '/'}" class="link">Retourner sur Flow Dating</a>
  </div>
</body>
</html>
  `;
}
