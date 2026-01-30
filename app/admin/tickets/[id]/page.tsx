'use client'

import { useEffect, useState, useCallback, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Clock,
  Send,
  Loader2,
  User,
  Shield,
  CheckCircle,
  Mail,
  Calendar,
  Monitor,
  ExternalLink,
  AlertTriangle,
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
  userAgent: string | null
  appVersion: string | null
  screenSize: string | null
  currentUrl: string | null
  createdAt: string
  updatedAt: string
  resolution: string | null
  userTicketsCount: number
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
    createdAt: string
    accountStatus: string
  }
  assignee: {
    id: string
    name: string | null
    image: string | null
  } | null
  resolver: {
    id: string
    name: string | null
  } | null
  messages: Message[]
}

const statusOptions = [
  { value: 'OPEN', label: 'Ouvert' },
  { value: 'IN_PROGRESS', label: 'En cours' },
  { value: 'WAITING_USER', label: 'Attente utilisateur' },
  { value: 'RESOLVED', label: 'Resolu' },
  { value: 'CLOSED', label: 'Ferme' },
]

const priorityOptions = [
  { value: 'LOW', label: 'Basse' },
  { value: 'MEDIUM', label: 'Moyenne' },
  { value: 'HIGH', label: 'Haute' },
  { value: 'CRITICAL', label: 'Critique' },
]

const statusLabels: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'Ouvert', color: 'bg-blue-100 text-blue-700' },
  IN_PROGRESS: { label: 'En cours', color: 'bg-yellow-100 text-yellow-700' },
  WAITING_USER: { label: 'Attente user', color: 'bg-orange-100 text-orange-700' },
  RESOLVED: { label: 'Resolu', color: 'bg-green-100 text-green-700' },
  CLOSED: { label: 'Ferme', color: 'bg-gray-100 text-gray-700' },
}

const priorityLabels: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Basse', color: 'bg-gray-100 text-gray-600' },
  MEDIUM: { label: 'Moyenne', color: 'bg-blue-100 text-blue-600' },
  HIGH: { label: 'Haute', color: 'bg-orange-100 text-orange-600' },
  CRITICAL: { label: 'Critique', color: 'bg-red-100 text-red-600' },
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

export default function AdminTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()

  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [resolution, setResolution] = useState('')

  // Edit state
  const [editStatus, setEditStatus] = useState('')
  const [editPriority, setEditPriority] = useState('')
  const [messageSent, setMessageSent] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchTicket = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/tickets/${id}`)
      if (res.ok) {
        const json = await res.json()
        setTicket(json.data)
        setEditStatus(json.data.status)
        setEditPriority(json.data.priority)
        setResolution(json.data.resolution || '')
      } else if (res.status === 404) {
        router.push('/admin/tickets')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchTicket()
  }, [fetchTicket])

  const handleUpdateTicket = async () => {
    if (!ticket) return

    setUpdating(true)
    try {
      const res = await fetch(`/api/admin/tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editStatus,
          priority: editPriority,
          resolution: resolution || undefined,
        }),
      })

      if (!res.ok) {
        throw new Error('Erreur lors de la mise a jour')
      }

      toast({
        title: 'Ticket mis a jour',
        description: 'Les modifications ont ete enregistrees.',
      })

      fetchTicket()
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre a jour le ticket',
        variant: 'destructive',
      })
    } finally {
      setUpdating(false)
    }
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim()) return

    setSending(true)
    setMessageSent(false)
    try {
      const res = await fetch(`/api/admin/tickets/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erreur lors de l\'envoi')
      }

      setNewMessage('')
      setMessageSent(true)
      await fetchTicket()
      scrollToBottom()

      toast({
        title: 'Message envoye',
        description: 'Votre reponse a ete envoyee a l\'utilisateur.',
      })

      // Reset success indicator after 3 seconds
      setTimeout(() => setMessageSent(false), 3000)
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible d\'envoyer le message',
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!ticket) return null

  const statusInfo = statusLabels[ticket.status] || statusLabels.OPEN
  const priorityInfo = priorityLabels[ticket.priority] || priorityLabels.MEDIUM
  const hasChanges = editStatus !== ticket.status || editPriority !== ticket.priority || resolution !== (ticket.resolution || '')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/tickets"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux tickets
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{ticket.subject}</h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
              <Badge className={priorityInfo.color}>{priorityInfo.label}</Badge>
              <span className="text-sm text-muted-foreground">
                {categoryLabels[ticket.category] || ticket.category}
              </span>
              <span className="text-sm text-muted-foreground">
                #{ticket.id.slice(-8)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{ticket.description}</p>
            </CardContent>
          </Card>

          {/* Messages */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conversation</CardTitle>
            </CardHeader>
            <CardContent>
              {ticket.messages.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Aucun message. Soyez le premier a repondre.
                </p>
              ) : (
                <div className="space-y-4 mb-6 max-h-[500px] overflow-y-auto">
                  {ticket.messages.map(msg => (
                    <div key={msg.id} className="flex gap-3">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={msg.user.image || undefined} />
                        <AvatarFallback className={msg.isAdmin ? 'bg-primary text-primary-foreground' : ''}>
                          {msg.isAdmin ? <Shield className="h-4 w-4" /> : getInitials(msg.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {msg.user.name || 'Utilisateur'}
                          </span>
                          {msg.isAdmin && (
                            <Badge variant="secondary" className="text-xs">Staff</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: fr })}
                          </span>
                        </div>
                        <div className={`p-3 rounded-lg ${
                          msg.isAdmin ? 'bg-primary/10 border border-primary/20' : 'bg-muted'
                        }`}>
                          <p className="whitespace-pre-wrap text-sm">{msg.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* Reply form */}
              <form onSubmit={handleSendMessage} className="space-y-4 border-t pt-4">
                {messageSent && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Message envoye avec succes !</span>
                  </div>
                )}
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Repondre a l'utilisateur..."
                  rows={3}
                  disabled={sending}
                  className={sending ? 'opacity-50' : ''}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {newMessage.length > 0 && `${newMessage.length} caractere(s)`}
                  </span>
                  <Button type="submit" disabled={sending || !newMessage.trim()}>
                    {sending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Envoyer
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* User info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Utilisateur
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={ticket.user.image || undefined} />
                  <AvatarFallback>{getInitials(ticket.user.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{ticket.user.name || 'Sans nom'}</p>
                  <p className="text-sm text-muted-foreground">{ticket.user.email}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Inscrit {formatDistanceToNow(new Date(ticket.user.createdAt), { addSuffix: true, locale: fr })}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {ticket.userTicketsCount} ticket(s) au total
                </div>
              </div>
              <Link href={`/admin/users/${ticket.user.id}`}>
                <Button variant="outline" size="sm" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Voir le profil
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Ticket management */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gestion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Statut</label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Priorite</label>
                <Select value={editPriority} onValueChange={setEditPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(editStatus === 'RESOLVED' || editStatus === 'CLOSED') && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Resolution</label>
                  <Textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder="Decrivez la resolution..."
                    rows={3}
                  />
                </div>
              )}

              {hasChanges && (
                <Button onClick={handleUpdateTicket} disabled={updating} className="w-full">
                  {updating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Sauvegarder
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Technical info */}
          {(ticket.userAgent || ticket.screenSize || ticket.currentUrl) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Infos techniques
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {ticket.screenSize && (
                  <div>
                    <span className="text-muted-foreground">Ecran:</span>{' '}
                    {ticket.screenSize}
                  </div>
                )}
                {ticket.currentUrl && (
                  <div>
                    <span className="text-muted-foreground">Page:</span>{' '}
                    <span className="font-mono text-xs break-all">{ticket.currentUrl}</span>
                  </div>
                )}
                {ticket.userAgent && (
                  <div>
                    <span className="text-muted-foreground">Navigateur:</span>
                    <p className="font-mono text-xs break-all mt-1">{ticket.userAgent}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Dates */}
          <Card>
            <CardContent className="pt-6 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                Cree le {format(new Date(ticket.createdAt), 'dd MMM yyyy a HH:mm', { locale: fr })}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                Mis a jour {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true, locale: fr })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
