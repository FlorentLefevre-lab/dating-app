'use client'

import { useEffect, useState, useCallback, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  ArrowLeft,
  Clock,
  Send,
  Loader2,
  User,
  Shield,
  CheckCircle,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useToast } from '@/components/ui/use-toast'

interface Message {
  id: string
  message: string
  isAdmin: boolean
  createdAt: string
  user: {
    id: string
    name: string | null
    image: string | null
    role: string
  }
}

interface TicketDetail {
  id: string
  subject: string
  description: string
  category: string
  priority: string
  status: string
  createdAt: string
  updatedAt: string
  resolution: string | null
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
  assignee: {
    id: string
    name: string | null
    image: string | null
  } | null
  messages: Message[]
}

const statusLabels: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'Ouvert', color: 'bg-blue-100 text-blue-700' },
  IN_PROGRESS: { label: 'En cours', color: 'bg-yellow-100 text-yellow-700' },
  WAITING_USER: { label: 'En attente de votre reponse', color: 'bg-orange-100 text-orange-700' },
  RESOLVED: { label: 'Resolu', color: 'bg-green-100 text-green-700' },
  CLOSED: { label: 'Ferme', color: 'bg-gray-100 text-gray-700' },
}

const categoryLabels: Record<string, string> = {
  BUG: 'Bug / Probleme technique',
  FEATURE_REQUEST: 'Suggestion',
  ACCOUNT_ISSUE: 'Probleme de compte',
  PAYMENT: 'Paiement',
  HARASSMENT: 'Signalement',
  TECHNICAL: 'Assistance technique',
  OTHER: 'Autre',
}

const priorityLabels: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Basse', color: 'bg-gray-100 text-gray-600' },
  MEDIUM: { label: 'Moyenne', color: 'bg-blue-100 text-blue-600' },
  HIGH: { label: 'Haute', color: 'bg-orange-100 text-orange-600' },
  CRITICAL: { label: 'Critique', color: 'bg-red-100 text-red-600' },
}

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')

  const fetchTicket = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets/${id}`)
      if (res.ok) {
        const json = await res.json()
        setTicket(json.data)
      } else if (res.status === 404) {
        router.push('/support')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/auth/login')
      return
    }
    if (authStatus === 'authenticated') {
      fetchTicket()
    }
  }, [authStatus, router, fetchTicket])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim()) return

    setSending(true)
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage }),
      })

      if (!res.ok) {
        throw new Error('Erreur lors de l\'envoi')
      }

      setNewMessage('')
      fetchTicket()

      toast({
        title: 'Message envoye',
        description: 'Votre message a ete ajoute au ticket.',
      })
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer le message',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  const getInitials = (name: string | null) => {
    if (!name) return '??'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  if (authStatus === 'loading' || loading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (!ticket) return null

  const statusInfo = statusLabels[ticket.status] || statusLabels.OPEN
  const priorityInfo = priorityLabels[ticket.priority] || priorityLabels.MEDIUM
  const isClosed = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/support"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux tickets
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{ticket.subject}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
              <Badge variant="outline" className={priorityInfo.color}>
                {priorityInfo.label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {categoryLabels[ticket.category] || ticket.category}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Ticket info */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Details du ticket</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Description</p>
            <p className="whitespace-pre-wrap">{ticket.description}</p>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Cree le:</span>{' '}
              {format(new Date(ticket.createdAt), 'dd MMM yyyy a HH:mm', { locale: fr })}
            </div>
            {ticket.assignee && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Assigne a:</span>
                <span className="font-medium">{ticket.assignee.name}</span>
              </div>
            )}
          </div>
          {ticket.resolution && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 font-semibold mb-2">
                <CheckCircle className="h-5 w-5" />
                Resolution
              </div>
              <p className="text-green-800">{ticket.resolution}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Messages */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Conversation</CardTitle>
        </CardHeader>
        <CardContent>
          {ticket.messages.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucun message pour le moment. Notre equipe va bientot vous repondre.
            </p>
          ) : (
            <div className="space-y-4">
              {ticket.messages.map(msg => {
                const isOwnMessage = msg.user.id === session?.user?.id

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                  >
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={msg.user.image || undefined} />
                      <AvatarFallback className={msg.isAdmin ? 'bg-primary text-primary-foreground' : ''}>
                        {msg.isAdmin ? <Shield className="h-4 w-4" /> : getInitials(msg.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`flex-1 max-w-[80%] ${isOwnMessage ? 'text-right' : ''}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-medium text-sm ${isOwnMessage ? 'order-2' : ''}`}>
                          {msg.isAdmin ? 'Support FlowDating' : msg.user.name || 'Vous'}
                        </span>
                        {msg.isAdmin && (
                          <Badge variant="secondary" className="text-xs">Staff</Badge>
                        )}
                        <span className={`text-xs text-muted-foreground ${isOwnMessage ? 'order-1' : ''}`}>
                          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: fr })}
                        </span>
                      </div>
                      <div
                        className={`p-3 rounded-lg ${
                          isOwnMessage
                            ? 'bg-primary text-primary-foreground ml-auto'
                            : msg.isAdmin
                            ? 'bg-blue-50 border border-blue-200'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm">{msg.message}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reply form */}
      {!isClosed ? (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSendMessage} className="space-y-4">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Ecrivez votre message..."
                rows={3}
                disabled={sending}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={sending || !newMessage.trim()}>
                  {sending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Envoyer
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            Ce ticket est ferme. Creez un nouveau ticket si vous avez besoin d&apos;aide.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
