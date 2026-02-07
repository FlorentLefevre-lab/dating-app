// app/api/admin/email-marketing/track/click/[trackingId]/route.ts
// GET - Track click and redirect to original URL

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { recordClickEvent } from '@/lib/email/tracking';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  try {
    const { trackingId } = await params;
    const { searchParams } = new URL(request.url);

    // Get the original URL (base64 encoded)
    const encodedUrl = searchParams.get('url');
    const linkId = searchParams.get('link');

    if (!encodedUrl) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Decode the original URL
    let originalUrl: string;
    try {
      originalUrl = Buffer.from(encodedUrl, 'base64').toString('utf-8');
    } catch {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Find the email send by tracking ID
    const emailSend = await prisma.emailSend.findUnique({
      where: { trackingId },
      select: {
        id: true,
        campaignId: true,
        clickedAt: true,
      },
    });

    if (emailSend) {
      // Get request metadata
      const userAgent = request.headers.get('user-agent') || undefined;
      const forwardedFor = request.headers.get('x-forwarded-for');
      const ip = forwardedFor?.split(',')[0]?.trim() ||
                 request.headers.get('x-real-ip') ||
                 undefined;

      // Record the click event (using trackingId, not sendId)
      await recordClickEvent(trackingId, originalUrl, {
        linkId: linkId || undefined,
        userAgent,
        ip,
      });
    }

    // Validate URL before redirecting
    try {
      const url = new URL(originalUrl);
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        return NextResponse.redirect(new URL('/', request.url));
      }
      return NextResponse.redirect(url);
    } catch {
      return NextResponse.redirect(new URL('/', request.url));
    }
  } catch (error) {
    console.error('Error tracking click:', error);
    // On error, try to redirect anyway
    const { searchParams } = new URL(request.url);
    const encodedUrl = searchParams.get('url');
    if (encodedUrl) {
      try {
        const originalUrl = Buffer.from(encodedUrl, 'base64').toString('utf-8');
        return NextResponse.redirect(new URL(originalUrl));
      } catch {
        // Fall through to default redirect
      }
    }
    return NextResponse.redirect(new URL('/', request.url));
  }
}
