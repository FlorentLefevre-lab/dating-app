import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '../../../lib/prisma';
import type { SendMessageRequest, PrismaMessage } from '../../../types/chat';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const body: SendMessageRequest = await request.json();
    const { senderId, receiverId, content, clientId } = body;

    // Vérifier que l'utilisateur peut envoyer le message
    if (session.user.id !== senderId) {
      return NextResponse.json({ error: 'Interdit' }, { status: 403 });
    }

    const message = await prisma.message.create({
      data: {
        content,
        senderId,
        receiverId,
        clientId,
        status: 'SENT',
        deliveredAt: new Date()
      },
      include: {
        sender: {
          select: { id: true, name: true, image: true }
        }
      }
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('Erreur création message:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const conversationWith = searchParams.get('conversationWith');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const userId = session.user.id;

    if (!conversationWith) {
      return NextResponse.json({ error: 'conversationWith requis' }, { status: 400 });
    }

    const messages: PrismaMessage[] = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: conversationWith },
          { senderId: conversationWith, receiverId: userId }
        ],
        deletedAt: null
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
      include: {
        sender: { 
          select: { id: true, name: true, image: true } 
        },
        receiver: { 
          select: { id: true, name: true, image: true } 
        }
      }
    });

    return NextResponse.json(messages.reverse());
  } catch (error) {
    console.error('Erreur récupération messages:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}