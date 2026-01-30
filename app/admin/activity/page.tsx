'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  RefreshCw,
  Users,
  Heart,
  Eye,
  ImageIcon,
  Flag,
  TrendingUp,
  AlertTriangle,
  UserPlus,
  Activity,
  MapPin,
  Zap,
  Trophy,
  Star,
  UserX,
  UserCheck,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts'

interface OnlineUser {
  id: string
  name: string | null
  image: string | null
  lastSeen: string | null
  region: string | null
  department: string | null
}

interface ActivityItem {
  id: string
  type: string
  message: string
  timestamp: string
  user?: { name?: string; image?: string }
  metadata?: Record<string, unknown>
}

interface TopUser {
  id: string
  name: string | null
  image: string | null
  count: number
}

interface Anomaly {
  id: string
  name: string | null
  likesLastHour: number
  type: string
}

interface RegionData {
  region: string
  count: number
}

interface HourlyData {
  hour: string
  likes: number
  matches: number
}

interface ActivityData {
  realtime: {
    onlineCount: number
    recentlyActive: number
    onlineUsers: OnlineUser[]
  }
  periodStats: {
    period: string
    newUsers: number
    newMatches: number
    newLikes: number
    newPhotos: number
    newReports: number
    profileViews: number
  }
  engagement: {
    totalLikes: number
    totalMatches: number
    totalViews: number
    conversionRate: number
  }
  activityFeed: ActivityItem[]
  charts: {
    hourlyActivity: HourlyData[]
    usersByRegion: RegionData[]
  }
  topUsers: {
    mostActive: TopUser[]
    mostPopular: TopUser[]
    mostMatches: TopUser[]
  }
  alerts: {
    anomalies: Anomaly[]
    inactiveUsers: number
    incompleteProfiles: number
  }
}

const activityTypeIcons: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  user_registered: { icon: UserPlus, color: 'text-green-600', bg: 'bg-green-100' },
  match_created: { icon: Heart, color: 'text-pink-600', bg: 'bg-pink-100' },
  report_created: { icon: Flag, color: 'text-orange-600', bg: 'bg-orange-100' },
  photo_uploaded: { icon: ImageIcon, color: 'text-blue-600', bg: 'bg-blue-100' },
}

export default function AdminActivityPage() {
  const [data, setData] = useState<ActivityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('24h')
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/activity?period=${period}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setData(json.data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchData])

  const formatTime = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: fr })
  }

  const getInitials = (name?: string | null) => {
    if (!name) return '??'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const periodLabels: Record<string, string> = {
    '24h': 'Dernieres 24h',
    '7d': '7 derniers jours',
    '30d': '30 derniers jours',
  }

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Activite</h1>
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activite de la plateforme</h1>
          <p className="text-muted-foreground">
            Suivi en temps reel de l&apos;activite des utilisateurs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Dernieres 24h</SelectItem>
              <SelectItem value="7d">7 derniers jours</SelectItem>
              <SelectItem value="30d">30 derniers jours</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
            {autoRefresh ? 'Live' : 'Pause'}
          </Button>
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Real-time Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">En ligne</p>
                <p className="text-3xl font-bold text-green-600">{data.realtime.onlineCount}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.realtime.recentlyActive} actifs (15 min)
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nouveaux inscrits</p>
                <p className="text-3xl font-bold">{data.periodStats.newUsers}</p>
                <p className="text-xs text-muted-foreground mt-1">{periodLabels[period]}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nouveaux matches</p>
                <p className="text-3xl font-bold">{data.periodStats.newMatches}</p>
                <p className="text-xs text-muted-foreground mt-1">{periodLabels[period]}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-pink-100 flex items-center justify-center">
                <Heart className="h-6 w-6 text-pink-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Likes donnes</p>
                <p className="text-3xl font-bold">{data.periodStats.newLikes}</p>
                <p className="text-xs text-muted-foreground mt-1">{periodLabels[period]}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <Heart className="h-6 w-6 text-red-600 fill-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second row of stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vues de profil</p>
                <p className="text-3xl font-bold">{data.periodStats.profileViews}</p>
              </div>
              <Eye className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Photos uploadees</p>
                <p className="text-3xl font-bold">{data.periodStats.newPhotos}</p>
              </div>
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Signalements</p>
                <p className="text-3xl font-bold">{data.periodStats.newReports}</p>
              </div>
              <Flag className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taux de conversion</p>
                <p className="text-3xl font-bold text-purple-600">{data.engagement.conversionRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">Likes → Matches</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {(data.alerts.anomalies.length > 0 || data.alerts.inactiveUsers > 100 || data.alerts.incompleteProfiles > 50) && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              Alertes et anomalies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {data.alerts.anomalies.length > 0 && (
                <div className="p-4 rounded-lg bg-red-100 border border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-5 w-5 text-red-600" />
                    <span className="font-semibold text-red-700">Activite suspecte</span>
                  </div>
                  <p className="text-sm text-red-600 mb-2">
                    {data.alerts.anomalies.length} utilisateur(s) avec +50 likes/heure
                  </p>
                  <div className="space-y-1">
                    {data.alerts.anomalies.slice(0, 3).map(a => (
                      <Link
                        key={a.id}
                        href={`/admin/users/${a.id}`}
                        className="flex items-center justify-between text-sm hover:bg-red-200 p-1 rounded"
                      >
                        <span>{a.name || 'Utilisateur'}</span>
                        <Badge variant="destructive">{a.likesLastHour} likes/h</Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 rounded-lg bg-yellow-100 border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <UserX className="h-5 w-5 text-yellow-600" />
                  <span className="font-semibold text-yellow-700">Utilisateurs inactifs</span>
                </div>
                <p className="text-2xl font-bold text-yellow-700">{data.alerts.inactiveUsers}</p>
                <p className="text-sm text-yellow-600">Inactifs depuis 30+ jours</p>
              </div>

              <div className="p-4 rounded-lg bg-blue-100 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-blue-700">Profils incomplets</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">{data.alerts.incompleteProfiles}</p>
                <p className="text-sm text-blue-600">Sans photo ou bio (7+ jours)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Activity Feed */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Flux d&apos;activite
            </CardTitle>
            <CardDescription>Activite en temps reel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {data.activityFeed.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucune activite recente</p>
              ) : (
                data.activityFeed.map(activity => {
                  const config = activityTypeIcons[activity.type] || activityTypeIcons.user_registered
                  const Icon = config.icon

                  return (
                    <div key={activity.id} className="flex items-start gap-3">
                      {activity.user?.image ? (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={activity.user.image} />
                          <AvatarFallback className="text-xs">
                            {getInitials(activity.user.name)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${config.bg}`}>
                          <Icon className={`h-4 w-4 ${config.color}`} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{activity.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tendances d&apos;activite
            </CardTitle>
            <CardDescription>Likes et matches par heure (24h)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {data.charts.hourlyActivity.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.charts.hourlyActivity}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="hour" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="likes"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={false}
                      name="Likes"
                    />
                    <Line
                      type="monotone"
                      dataKey="matches"
                      stroke="#ec4899"
                      strokeWidth={2}
                      dot={false}
                      name="Matches"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Pas assez de donnees pour afficher le graphique
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Online Users & Regions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Online Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              Utilisateurs en ligne
              <Badge variant="secondary" className="ml-auto">
                {data.realtime.onlineCount}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {data.realtime.onlineUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucun utilisateur en ligne</p>
              ) : (
                data.realtime.onlineUsers.map(user => (
                  <Link
                    key={user.id}
                    href={`/admin/users/${user.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.image || undefined} />
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.name || 'Sans nom'}</p>
                      {user.region && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {user.region}
                        </p>
                      )}
                    </div>
                    {user.lastSeen && (
                      <span className="text-xs text-muted-foreground">
                        {formatTime(user.lastSeen)}
                      </span>
                    )}
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Users by Region */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Repartition geographique
            </CardTitle>
            <CardDescription>Utilisateurs en ligne par region</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {data.charts.usersByRegion.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.usersByRegion} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="region" type="category" className="text-xs" width={120} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Utilisateurs" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Aucune donnee de region disponible
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top utilisateurs
          </CardTitle>
          <CardDescription>Classement sur la periode selectionnee</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active">
            <TabsList className="mb-4">
              <TabsTrigger value="active">Plus actifs</TabsTrigger>
              <TabsTrigger value="popular">Plus populaires</TabsTrigger>
              <TabsTrigger value="matches">Plus de matches</TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                {data.topUsers.mostActive.length === 0 ? (
                  <p className="col-span-full text-center text-muted-foreground py-4">
                    Aucune donnee disponible
                  </p>
                ) : (
                  data.topUsers.mostActive.map((user, index) => (
                    <Link
                      key={user.id}
                      href={`/admin/users/${user.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <span className="text-lg font-bold text-muted-foreground w-6">
                        #{index + 1}
                      </span>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.image || undefined} />
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.name || 'Sans nom'}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Heart className="h-3 w-3 fill-red-500 text-red-500" />
                          {user.count} likes donnes
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="popular">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                {data.topUsers.mostPopular.length === 0 ? (
                  <p className="col-span-full text-center text-muted-foreground py-4">
                    Aucune donnee disponible
                  </p>
                ) : (
                  data.topUsers.mostPopular.map((user, index) => (
                    <Link
                      key={user.id}
                      href={`/admin/users/${user.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <span className="text-lg font-bold text-muted-foreground w-6">
                        #{index + 1}
                      </span>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.image || undefined} />
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.name || 'Sans nom'}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                          {user.count} likes recus
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="matches">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                {data.topUsers.mostMatches.length === 0 ? (
                  <p className="col-span-full text-center text-muted-foreground py-4">
                    Aucune donnee disponible
                  </p>
                ) : (
                  data.topUsers.mostMatches.map((user, index) => (
                    <Link
                      key={user.id}
                      href={`/admin/users/${user.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <span className="text-lg font-bold text-muted-foreground w-6">
                        #{index + 1}
                      </span>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.image || undefined} />
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.name || 'Sans nom'}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Heart className="h-3 w-3 fill-pink-500 text-pink-500" />
                          {user.count} matches
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
