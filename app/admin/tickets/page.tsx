'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  RefreshCw,
  Ticket,
  AlertTriangle,
  Clock,
  CheckCircle,
  MessageSquare,
  User,
  ChevronRight,
  Inbox,
  Loader2,
  Filter,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface TicketData {
  id: string
  subject: string
  description: string
  category: string
  priority: string
  status: string
  createdAt: string
  updatedAt: string
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
  _count: {
    messages: number
  }
}

interface Stats {
  open: number
  inProgress: number
  waiting: number
  critical: number
}

const statusLabels: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  OPEN: { label: 'Ouvert', color: 'bg-blue-100 text-blue-700', icon: Inbox },
  IN_PROGRESS: { label: 'En cours', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  WAITING_USER: { label: 'Attente user', color: 'bg-orange-100 text-orange-700', icon: User },
  RESOLVED: { label: 'Resolu', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  CLOSED: { label: 'Ferme', color: 'bg-gray-100 text-gray-700', icon: CheckCircle },
}

const priorityLabels: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Basse', color: 'bg-gray-100 text-gray-600' },
  MEDIUM: { label: 'Moyenne', color: 'bg-blue-100 text-blue-600' },
  HIGH: { label: 'Haute', color: 'bg-orange-100 text-orange-600' },
  CRITICAL: { label: 'Critique', color: 'bg-red-100 text-red-600' },
}

const categoryLabels: Record<string, string> = {
  BUG: 'Bug',
  FEATURE_REQUEST: 'Suggestion',
  ACCOUNT_ISSUE: 'Compte',
  PAYMENT: 'Paiement',
  HARASSMENT: 'Signalement',
  TECHNICAL: 'Technique',
  OTHER: 'Autre',
}

export default function AdminTicketsPage() {
  const router = useRouter()
  const [tickets, setTickets] = useState<TicketData[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [assignedFilter, setAssignedFilter] = useState('all')

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (categoryFilter !== 'all') params.set('category', categoryFilter)
      if (priorityFilter !== 'all') params.set('priority', priorityFilter)
      if (assignedFilter !== 'all') params.set('assignedTo', assignedFilter)

      const res = await fetch(`/api/admin/tickets?${params}`)
      if (res.ok) {
        const json = await res.json()
        setTickets(json.data || [])
        setStats(json.stats || null)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, categoryFilter, priorityFilter, assignedFilter])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  const getInitials = (name: string | null) => {
    if (!name) return '??'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tickets Support</h1>
          <p className="text-muted-foreground">
            Gestion des demandes utilisateurs
          </p>
        </div>
        <Button variant="outline" onClick={fetchTickets} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ouverts</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.open}</p>
                </div>
                <Inbox className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">En cours</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Attente user</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.waiting}</p>
                </div>
                <User className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Critiques</p>
                  <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtres:</span>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="OPEN">Ouvert</SelectItem>
                <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                <SelectItem value="WAITING_USER">Attente user</SelectItem>
                <SelectItem value="RESOLVED">Resolu</SelectItem>
                <SelectItem value="CLOSED">Ferme</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Categorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="BUG">Bug</SelectItem>
                <SelectItem value="FEATURE_REQUEST">Suggestion</SelectItem>
                <SelectItem value="ACCOUNT_ISSUE">Compte</SelectItem>
                <SelectItem value="PAYMENT">Paiement</SelectItem>
                <SelectItem value="HARASSMENT">Signalement</SelectItem>
                <SelectItem value="TECHNICAL">Technique</SelectItem>
                <SelectItem value="OTHER">Autre</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priorite" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="CRITICAL">Critique</SelectItem>
                <SelectItem value="HIGH">Haute</SelectItem>
                <SelectItem value="MEDIUM">Moyenne</SelectItem>
                <SelectItem value="LOW">Basse</SelectItem>
              </SelectContent>
            </Select>
            <Select value={assignedFilter} onValueChange={setAssignedFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Assignation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="unassigned">Non assigne</SelectItem>
                <SelectItem value="me">Mes tickets</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Tickets ({tickets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun ticket trouve avec ces filtres
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map(ticket => {
                const statusInfo = statusLabels[ticket.status] || statusLabels.OPEN
                const priorityInfo = priorityLabels[ticket.priority] || priorityLabels.MEDIUM
                const StatusIcon = statusInfo.icon

                return (
                  <div
                    key={ticket.id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/admin/tickets/${ticket.id}`)}
                  >
                    {/* Priority indicator */}
                    <div className={`w-1 h-12 rounded-full ${
                      ticket.priority === 'CRITICAL' ? 'bg-red-500' :
                      ticket.priority === 'HIGH' ? 'bg-orange-500' :
                      ticket.priority === 'MEDIUM' ? 'bg-blue-500' :
                      'bg-gray-300'
                    }`} />

                    {/* User avatar */}
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={ticket.user.image || undefined} />
                      <AvatarFallback>{getInitials(ticket.user.name)}</AvatarFallback>
                    </Avatar>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{ticket.subject}</h3>
                        <Badge variant="outline" className="text-xs">
                          {categoryLabels[ticket.category] || ticket.category}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground">
                          {ticket.user.name || ticket.user.email}
                        </span>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: fr })}
                        </span>
                        {ticket._count.messages > 0 && (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {ticket._count.messages}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status & Priority */}
                    <div className="flex items-center gap-2">
                      <Badge className={statusInfo.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusInfo.label}
                      </Badge>
                      <Badge className={priorityInfo.color}>
                        {priorityInfo.label}
                      </Badge>
                    </div>

                    {/* Assignee */}
                    {ticket.assignee ? (
                      <Avatar className="h-8 w-8" title={ticket.assignee.name || 'Assigne'}>
                        <AvatarImage src={ticket.assignee.image || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(ticket.assignee.name)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-8 w-8 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                        <User className="h-4 w-4 text-muted-foreground/50" />
                      </div>
                    )}

                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
