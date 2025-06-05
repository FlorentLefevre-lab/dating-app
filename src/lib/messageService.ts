import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';
import type { FirebaseMessage, SendMessageRequest, MessageStatus } from '../types/chat';

export class MessageService {
  /**
   * Générer l'ID unique de conversation entre deux utilisateurs
   */
  static generateConversationId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join('-');
  }

  /**
   * Envoyer un message
   */
  static async sendMessage(
    senderId: string, 
    receiverId: string, 
    content: string, 
    clientId: string
  ): Promise<string> {
    const conversationId = this.generateConversationId(senderId, receiverId);
    
    try {
      // 1. Sauvegarder dans Firebase (temps réel)
      const firebaseRef = await addDoc(
        collection(db, 'conversations', conversationId, 'messages'), 
        {
          senderId,
          receiverId,
          content,
          clientId,
          status: 'SENT' as MessageStatus,
          timestamp: serverTimestamp(),
          synced: false
        }
      );

      // 2. Sauvegarder dans Prisma (persistance)
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId,
          receiverId,
          content,
          clientId,
          firebaseId: firebaseRef.id
        } as SendMessageRequest)
      });

      if (response.ok) {
        // Marquer comme synchronisé dans Firebase
        await updateDoc(firebaseRef, { synced: true });
      } else {
        throw new Error('Erreur sauvegarde Prisma');
      }

      return firebaseRef.id;
    } catch (error) {
      console.error('Erreur envoi message:', error);
      throw error;
    }
  }

  /**
   * Écouter les messages en temps réel
   */
  static subscribeToMessages(
    userId1: string, 
    userId2: string, 
    callback: (messages: FirebaseMessage[]) => void
  ): Unsubscribe {
    const conversationId = this.generateConversationId(userId1, userId2);
    
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const messages: FirebaseMessage[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          senderId: data.senderId,
          receiverId: data.receiverId,
          content: data.content,
          clientId: data.clientId,
          status: data.status as MessageStatus,
          timestamp: data.timestamp?.toDate() || null,
          synced: data.synced || false
        };
      });
      callback(messages);
    });
  }

  /**
   * Marquer une conversation comme lue
   */
  static async markConversationAsRead(
    currentUserId: string, 
    otherUserId: string
  ): Promise<void> {
    try {
      await fetch('/api/messages/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          conversationWith: otherUserId 
        })
      });
    } catch (error) {
      console.error('Erreur marquer comme lu:', error);
    }
  }
}