'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Ticket,
  Plus,
  Bug,
  Lightbulb,
  User,
  CreditCard,
  AlertTriangle,
  Wrench,
  HelpCircle,
  Clock,
  CheckCircle,
  MessageSquare,
  Loader2,
  ChevronRight,
  Send,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useToast } from '@/components/ui/use-toast'

interface TicketData {
  id: string
  subject: string
  description: string
  category: string
  priority: string
  status: string
  createdAt: string
  updatedAt: string
  messages: Array<{ id: string }>
  assignee?: { name: string } | null
}

const categoryOptions = [
  { value: 'BUG', label: 'Bug / Probleme technique', icon: Bug, color: 'text-red-500' },
  { value: 'FEATURE_REQUEST', label: 'Suggestion de fonctionnalite', icon: Lightbulb, color: 'text-yellow-500' },
  { value: 'ACCOUNT_ISSUE', label: 'Probleme de compte', icon: User, color: 'text-blue-500' },
  { value: 'PAYMENT', label: 'Paiement / Abonnement', icon: CreditCard, color: 'text-green-500' },
  { value: 'HARASSMENT', label: 'Signaler un comportement', icon: AlertTriangle, color: 'text-orange-500' },
  { value: 'TECHNICAL', label: 'Assistance technique', icon: Wrench, color: 'text-purple-500' },
  { value: 'OTHER', label: 'Autre', icon: HelpCircle, color: 'text-gray-500' },
]

const statusLabels: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'Ouvert', color: 'bg-blue-100 text-blue-700' },
  IN_PROGRESS: { label: 'En cours', color: 'bg-yellow-100 text-yellow-700' },
  WAITING_USER: { label: 'En attente de votre reponse', color: 'bg-orange-100 text-orange-700' },
  RESOLVED: { label: 'Resolu', color: 'bg-green-100 text-green-700' },
  CLOSED: { label: 'Ferme', color: 'bg-gray-100 text-gray-700' },
}

const priorityLabels: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Basse', color: 'bg-gray-100 text-gray-600' },
  MEDIUM: { label: 'Moyenne', color: 'bg-blue-100 text-blue-600' },
  HIGH: { label: 'Haute', color: 'bg-orange-100 text-orange-600' },
  CRITICAL: { label: 'Critique', color: 'bg-red-100 text-red-600' },
}

export default function SupportPage() {
  const { status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [tickets, setTickets] = useState<TicketData[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Form state
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState('MEDIUM')

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch('/api/tickets')
      if (res.ok) {
        const json = await res.json()
        setTickets(json.data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
      return
    }
    if (status === 'authenticated') {
      fetchTickets()
    }
  }, [status, router, fetchTickets])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!category) {
      toast({
        title: 'Erreur',
        description: 'Veuillez selectionner une categorie',
        variant: 'destructive',
      })
      return
    }

    if (!subject || subject.length < 5) {
      toast({
        title: 'Erreur',
        description: 'Le sujet doit faire au moins 5 caracteres',
        variant: 'destructive',
      })
      return
    }

    if (!description || description.length < 10) {
      toast({
        title: 'Erreur',
        description: 'La description doit faire au moins 10 caracteres',
        variant: 'destructive',
      })
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          description,
          category,
          priority,
          userAgent: navigator.userAgent,
          screenSize: `${window.innerWidth}x${window.innerHeight}`,
          currentUrl: window.location.href,
          appVersion: '1.0.0',
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Erreur lors de la creation')
      }

      toast({
        title: 'Ticket cree',
        description: 'Votre demande a ete envoyee. Nous vous repondrons rapidement.',
      })

      // Reset form
      setSubject('')
      setDescription('')
      setCategory('')
      setPriority('MEDIUM')
      setDialogOpen(false)

      // Refresh list
      fetchTickets()
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de la creation',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  const getCategoryIcon = (cat: string) => {
    const option = categoryOptions.find(o => o.value === cat)
    if (!option) return HelpCircle
    return option.icon
  }

  const getCategoryColor = (cat: string) => {
    const option = categoryOptions.find(o => o.value === cat)
    return option?.color || 'text-gray-500'
  }

  if (status === 'loading' || loading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Ticket className="h-8 w-8 text-primary" />
            Support
          </h1>
          <p className="text-muted-foreground mt-1">
            Besoin d&apos;aide ? Creez un ticket et notre equipe vous repondra.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Nouveau ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Creer un ticket</DialogTitle>
              <DialogDescription>
                Decrivez votre probleme ou suggestion. Plus vous donnez de details, plus vite nous pourrons vous aider.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categorie *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionnez une categorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map(opt => {
                      const Icon = opt.icon
                      return (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${opt.color}`} />
                            {opt.label}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Sujet *</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Resume de votre demande"
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground">{subject.length}/200 caracteres</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Decrivez votre probleme en detail. Si c'est un bug, indiquez les etapes pour le reproduire."
                  rows={6}
                  maxLength={5000}
                />
                <p className="text-xs text-muted-foreground">{description.length}/5000 caracteres (min. 10)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priorite</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Basse - Question generale</SelectItem>
                    <SelectItem value="MEDIUM">Moyenne - Probleme non bloquant</SelectItem>
                    <SelectItem value="HIGH">Haute - Probleme important</SelectItem>
                    <SelectItem value="CRITICAL">Critique - Impossible d&apos;utiliser l&apos;app</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Envoyer
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tickets list */}
      {tickets.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Ticket className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Aucun ticket</h3>
            <p className="text-muted-foreground mb-6">
              Vous n&apos;avez pas encore cree de ticket. Besoin d&apos;aide ?
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Creer mon premier ticket
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tickets.map(ticket => {
            const CategoryIcon = getCategoryIcon(ticket.category)
            const statusInfo = statusLabels[ticket.status] || statusLabels.OPEN
            const priorityInfo = priorityLabels[ticket.priority] || priorityLabels.MEDIUM

            return (
              <Card
                key={ticket.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/support/${ticket.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg bg-gray-100 ${getCategoryColor(ticket.category)}`}>
                      <CategoryIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold truncate">{ticket.subject}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                            {ticket.description}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      </div>
                      <div className="flex items-center gap-3 mt-3 flex-wrap">
                        <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                        <Badge variant="outline" className={priorityInfo.color}>
                          {priorityInfo.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: fr })}
                        </span>
                        {ticket.messages.length > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {ticket.messages.length} message(s)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
