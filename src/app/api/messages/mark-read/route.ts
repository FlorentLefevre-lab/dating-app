import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth'
const session = await auth()
import { prisma } from '../../../../lib/prisma';

interface MarkReadBody {
  conversationWith: string;
  messageIds?: string[];
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const body: MarkReadBody = await request.json();
    const { conversationWith, messageIds } = body;
    const userId = session.user.id;

    if (messageIds && messageIds.length > 0) {
      // Marquer des messages spécifiques
      await prisma.message.updateMany({
        where: {
          id: { in: messageIds },
          senderId: conversationWith,
          receiverId: userId,
          readAt: null
        },
        data: {
          readAt: new Date()
        }
      });
    } else {
      // Marquer tous les messages non lus de la conversation
      await prisma.message.updateMany({
        where: {
          senderId: conversationWith,
          receiverId: userId,
          readAt: null
        },
        data: {
          readAt: new Date()
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur marquer comme lu:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}