'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Chat from '../../../components/Chat';
import type { ChatUser } from '../../../types/chat';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [otherUser, setOtherUser] = useState<ChatUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = params.userId as string;

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/login');
      return;
    }

    if (userId && typeof userId === 'string') {
      loadUser(userId);
    }
  }, [userId, session, status]);

  const loadUser = async (id: string): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${id}`);
      
      if (!response.ok) {
        throw new Error('Utilisateur non trouvé');
      }
      
      const userData: ChatUser = await response.json();
      setOtherUser(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Chargement...</p>
        
        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            gap: 1rem;
          }
          
          .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #007bff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Erreur</h2>
        <p>{error}</p>
        <button onClick={() => router.back()}>
          Retour
        </button>
        
        <style jsx>{`
          .error-container {
            text-align: center;
            padding: 2rem;
            color: #dc3545;
          }
          
          button {
            margin-top: 1rem;
            padding: 0.5rem 1rem;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
        `}</style>
      </div>
    );
  }

  if (!otherUser) {
    return (
      <div className="not-found">
        <h2>Utilisateur non trouvé</h2>
        <button onClick={() => router.back()}>
          Retour
        </button>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <div className="container">
        <Chat 
          otherUserId={otherUser.id}
          otherUserName={otherUser.name || 'Utilisateur inconnu'}
          otherUserImage={otherUser.image || '/default-avatar.png'}
        />
      </div>
      
      <style jsx>{`
        .chat-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem;
        }
        
        .container {
          max-width: 800px;
          margin: 0 auto;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: calc(100vh - 4rem);
        }
        
        .not-found {
          text-align: center;
          padding: 2rem;
          color: #666;
          background: white;
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
}