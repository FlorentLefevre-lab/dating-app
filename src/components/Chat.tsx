import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { MessageService } from '../lib/messageService';

export default function Chat({ otherUserId, otherUserName, otherUserImage }) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!session?.user?.id || !otherUserId) return;

    // Charger l'historique depuis Prisma
    loadMessageHistory();

    // Écouter les nouveaux messages via Firebase
    const unsubscribe = MessageService.subscribeToMessages(
      session.user.id,
      otherUserId,
      (firebaseMessages) => {
        // Fusionner avec les messages existants
        setMessages(prev => {
          const combined = [...prev];
          firebaseMessages.forEach(fbMsg => {
            if (!combined.find(m => m.clientId === fbMsg.clientId)) {
              combined.push({
                id: fbMsg.id,
                content: fbMsg.content,
                senderId: fbMsg.senderId,
                receiverId: fbMsg.receiverId,
                createdAt: fbMsg.timestamp,
                clientId: fbMsg.clientId,
                status: fbMsg.status,
                sender: { 
                  id: fbMsg.senderId,
                  name: fbMsg.senderId === session.user.id ? session.user.name : otherUserName,
                  image: fbMsg.senderId === session.user.id ? session.user.image : otherUserImage
                }
              });
            }
          });
          return combined.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        });
      }
    );

    return unsubscribe;
  }, [session?.user?.id, otherUserId]);

  useEffect(scrollToBottom, [messages]);

  const loadMessageHistory = async () => {
    try {
      const response = await fetch(`/api/messages?conversationWith=${otherUserId}`);
      if (response.ok) {
        const history = await response.json();
        setMessages(history);
      }
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !session?.user?.id) return;

    const clientId = `${Date.now()}-${Math.random()}`;
    const tempMessage = {
      id: clientId,
      content: newMessage,
      senderId: session.user.id,
      receiverId: otherUserId,
      createdAt: new Date(),
      clientId,
      status: 'SENDING',
      sender: session.user
    };

    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    setLoading(true);

    try {
      await MessageService.sendMessage(
        session.user.id,
        otherUserId,
        newMessage,
        clientId
      );
    } catch (error) {
      console.error('Erreur envoi:', error);
      // Marquer le message comme échoué
      setMessages(prev => 
        prev.map(m => 
          m.clientId === clientId 
            ? { ...m, status: 'FAILED' }
            : m
        )
      );
    }
    setLoading(false);
  };

  if (!session) return <div>Connectez-vous pour chatter</div>;

  return (
    <div className="chat-container">
      <div className="chat-header">
        <img src={otherUserImage} alt={otherUserName} className="avatar" />
        <h3>{otherUserName}</h3>
      </div>

      <div className="messages">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`message ${message.senderId === session.user.id ? 'own' : 'other'}`}
          >
            <div className="message-content">
              {message.content}
              {message.status === 'SENDING' && <span className="status">📤</span>}
              {message.status === 'FAILED' && <span className="status">❌</span>}
            </div>
            <div className="message-time">
              {new Date(message.createdAt).toLocaleTimeString()}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="message-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Écrivez votre message..."
          disabled={loading}
        />
        <button type="submit" disabled={loading || !newMessage.trim()}>
          Envoyer
        </button>
      </form>

      <style jsx>{`
        .chat-container {
          max-width: 600px;
          height: 600px;
          border: 1px solid #ddd;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          background: white;
        }

        .chat-header {
          display: flex;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #eee;
          background: #f8f9fa;
        }

        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          margin-right: 0.5rem;
        }

        .messages {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          background: #f5f5f5;
        }

        .message {
          margin-bottom: 1rem;
          max-width: 70%;
        }

        .message.own {
          margin-left: auto;
        }

        .message-content {
          padding: 0.75rem;
          border-radius: 18px;
          word-wrap: break-word;
        }

        .message.own .message-content {
          background: #007bff;
          color: white;
        }

        .message.other .message-content {
          background: white;
          border: 1px solid #ddd;
        }

        .message-time {
          font-size: 0.7rem;
          color: #666;
          margin-top: 0.25rem;
          text-align: right;
        }

        .message.other .message-time {
          text-align: left;
        }

        .status {
          margin-left: 0.5rem;
          font-size: 0.8rem;
        }

        .message-form {
          display: flex;
          padding: 1rem;
          border-top: 1px solid #eee;
          background: white;
        }

        .message-form input {
          flex: 1;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 25px;
          margin-right: 0.5rem;
          outline: none;
        }

        .message-form button {
          padding: 0.75rem 1.5rem;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 25px;
          cursor: pointer;
        }

        .message-form button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}