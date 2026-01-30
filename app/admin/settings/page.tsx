'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Save,
  RefreshCw,
  RotateCcw,
  Shield,
  Users,
  UserPlus,
  Heart,
  Settings2,
  Bell,
  Lock,
  Server,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Info,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface AppSettings {
  id: string
  // Modération
  nsfwThreshold: number
  reportsBeforeAutoSuspend: number
  suspensionDurations: number[]
  autoApprovePhotos: boolean
  // Limites
  dailyLikesLimit: number
  dailyLikesLimitPremium: number
  dailySuperLikesLimit: number
  dailySuperLikesLimitPremium: number
  maxPhotosPerUser: number
  dailyMessagesLimitNewUsers: number
  dailyRewindsLimit: number
  dailyRewindsLimitPremium: number
  // Inscription
  minAge: number
  maxAge: number
  emailVerificationRequired: boolean
  registrationOpen: boolean
  allowedRegions: string[]
  // Matching
  defaultMaxDistance: number
  maxDistanceLimit: number
  defaultAgeRange: number
  // Feature flags
  maintenanceMode: boolean
  maintenanceMessage: string
  premiumEnabled: boolean
  videoChatEnabled: boolean
  storiesEnabled: boolean
  boostEnabled: boolean
  // Messages
  globalAnnouncement: string
  announcementType: string
  welcomeMessage: string
  termsUrl: string
  privacyUrl: string
  // Sécurité
  maxLoginAttempts: number
  loginBlockDuration: number
  sessionExpirationHours: number
  forceHttps: boolean
  // Meta
  updatedAt: string
  updatedBy: string | null
}

interface SystemInfo {
  version: string
  environment: string
  nodeVersion: string
  databaseStatus: string
  uptime: number
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [originalSettings, setOriginalSettings] = useState<AppSettings | null>(null)
  const { toast } = useToast()

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings')
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setSettings(json.data.settings)
      setOriginalSettings(json.data.settings)
      setSystemInfo(json.data.systemInfo)
      setHasChanges(false)
    } catch (error) {
      console.error('Error:', error)
      toast({ title: 'Erreur', description: 'Erreur lors du chargement des parametres', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    if (!settings) return
    setSettings({ ...settings, [key]: value })
    setHasChanges(true)
  }

  const saveSettings = async () => {
    if (!settings) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Erreur lors de la sauvegarde')
      }
      setSettings(json.data)
      setOriginalSettings(json.data)
      setHasChanges(false)
      toast({ title: 'Succes', description: 'Parametres sauvegardes avec succes' })
    } catch (error) {
      console.error('Error:', error)
      toast({ title: 'Erreur', description: error instanceof Error ? error.message : 'Erreur lors de la sauvegarde', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const resetSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Erreur lors de la reinitialisation')
      }
      setSettings(json.data)
      setOriginalSettings(json.data)
      setHasChanges(false)
      toast({ title: 'Succes', description: 'Parametres reinitialises aux valeurs par defaut' })
    } catch (error) {
      console.error('Error:', error)
      toast({ title: 'Erreur', description: 'Erreur lors de la reinitialisation', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const discardChanges = () => {
    if (originalSettings) {
      setSettings(originalSettings)
      setHasChanges(false)
    }
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (days > 0) return `${days}j ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Parametres</h1>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-32 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!settings) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Parametres</h1>
          <p className="text-muted-foreground">
            Configuration globale de l&apos;application
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="border-orange-300 text-orange-600">
              Modifications non sauvegardees
            </Badge>
          )}
          <Button variant="outline" onClick={discardChanges} disabled={!hasChanges || saving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Annuler
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={saving}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reinitialiser
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reinitialiser les parametres ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action va remettre tous les parametres a leurs valeurs par defaut.
                  Cette action est irreversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={resetSettings}>
                  Reinitialiser
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={saveSettings} disabled={!hasChanges || saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Sauvegarder
          </Button>
        </div>
      </div>

      {/* Maintenance Warning */}
      {settings.maintenanceMode && (
        <Card className="border-orange-300 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-semibold text-orange-800">Mode maintenance actif</p>
                <p className="text-sm text-orange-600">
                  Les utilisateurs ne peuvent pas acceder a l&apos;application.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="moderation" className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="moderation" className="flex items-center gap-1">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Moderation</span>
          </TabsTrigger>
          <TabsTrigger value="limits" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Limites</span>
          </TabsTrigger>
          <TabsTrigger value="registration" className="flex items-center gap-1">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Inscription</span>
          </TabsTrigger>
          <TabsTrigger value="matching" className="flex items-center gap-1">
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">Matching</span>
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-1">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Features</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-1">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Messages</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1">
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">Securite</span>
          </TabsTrigger>
        </TabsList>

        {/* MODÉRATION */}
        <TabsContent value="moderation">
          <Card>
            <CardHeader>
              <CardTitle>Parametres de moderation</CardTitle>
              <CardDescription>
                Configuration de la moderation automatique et manuelle
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Seuil NSFW pour auto-flag ({(settings.nsfwThreshold * 100).toFixed(0)}%)</Label>
                  <Slider
                    value={[settings.nsfwThreshold * 100]}
                    onValueChange={([v]) => updateSetting('nsfwThreshold', v / 100)}
                    max={100}
                    step={5}
                  />
                  <p className="text-sm text-muted-foreground">
                    Les photos avec un score NSFW superieur a ce seuil seront automatiquement signalees
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reportsBeforeAutoSuspend">
                    Signalements avant auto-suspension
                  </Label>
                  <Input
                    id="reportsBeforeAutoSuspend"
                    type="number"
                    min={1}
                    max={100}
                    value={settings.reportsBeforeAutoSuspend}
                    onChange={(e) => updateSetting('reportsBeforeAutoSuspend', parseInt(e.target.value) || 5)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Nombre de signalements avant suspension automatique du compte
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-approuver les photos</Label>
                    <p className="text-sm text-muted-foreground">
                      Desactive la moderation manuelle des photos
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoApprovePhotos}
                    onCheckedChange={(v) => updateSetting('autoApprovePhotos', v)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LIMITES */}
        <TabsContent value="limits">
          <Card>
            <CardHeader>
              <CardTitle>Limites utilisateurs</CardTitle>
              <CardDescription>
                Limitations quotidiennes pour les comptes gratuits et premium
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4 p-4 rounded-lg border">
                  <h3 className="font-semibold">Compte gratuit</h3>
                  <div className="space-y-2">
                    <Label htmlFor="dailyLikesLimit">Likes par jour</Label>
                    <Input
                      id="dailyLikesLimit"
                      type="number"
                      min={0}
                      max={9999}
                      value={settings.dailyLikesLimit}
                      onChange={(e) => updateSetting('dailyLikesLimit', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dailySuperLikesLimit">Super likes par jour</Label>
                    <Input
                      id="dailySuperLikesLimit"
                      type="number"
                      min={0}
                      max={99}
                      value={settings.dailySuperLikesLimit}
                      onChange={(e) => updateSetting('dailySuperLikesLimit', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dailyRewindsLimit">Rewinds par jour</Label>
                    <Input
                      id="dailyRewindsLimit"
                      type="number"
                      min={0}
                      max={99}
                      value={settings.dailyRewindsLimit}
                      onChange={(e) => updateSetting('dailyRewindsLimit', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="space-y-4 p-4 rounded-lg border border-yellow-300 bg-yellow-50/50">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Badge variant="secondary" className="bg-yellow-200">Premium</Badge>
                    Compte premium
                  </h3>
                  <div className="space-y-2">
                    <Label htmlFor="dailyLikesLimitPremium">Likes par jour</Label>
                    <Input
                      id="dailyLikesLimitPremium"
                      type="number"
                      min={0}
                      max={9999}
                      value={settings.dailyLikesLimitPremium}
                      onChange={(e) => updateSetting('dailyLikesLimitPremium', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dailySuperLikesLimitPremium">Super likes par jour</Label>
                    <Input
                      id="dailySuperLikesLimitPremium"
                      type="number"
                      min={0}
                      max={99}
                      value={settings.dailySuperLikesLimitPremium}
                      onChange={(e) => updateSetting('dailySuperLikesLimitPremium', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dailyRewindsLimitPremium">Rewinds par jour</Label>
                    <Input
                      id="dailyRewindsLimitPremium"
                      type="number"
                      min={0}
                      max={99}
                      value={settings.dailyRewindsLimitPremium}
                      onChange={(e) => updateSetting('dailyRewindsLimitPremium', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="maxPhotosPerUser">Photos max par profil</Label>
                  <Input
                    id="maxPhotosPerUser"
                    type="number"
                    min={1}
                    max={20}
                    value={settings.maxPhotosPerUser}
                    onChange={(e) => updateSetting('maxPhotosPerUser', parseInt(e.target.value) || 6)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dailyMessagesLimitNewUsers">Messages/jour (nouveaux comptes)</Label>
                  <Input
                    id="dailyMessagesLimitNewUsers"
                    type="number"
                    min={0}
                    max={999}
                    value={settings.dailyMessagesLimitNewUsers}
                    onChange={(e) => updateSetting('dailyMessagesLimitNewUsers', parseInt(e.target.value) || 20)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Pour les comptes de moins de 7 jours
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INSCRIPTION */}
        <TabsContent value="registration">
          <Card>
            <CardHeader>
              <CardTitle>Parametres d&apos;inscription</CardTitle>
              <CardDescription>
                Configuration des conditions d&apos;inscription
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg border border-red-200 bg-red-50/50">
                <div className="space-y-0.5">
                  <Label className="text-base">Inscriptions ouvertes</Label>
                  <p className="text-sm text-muted-foreground">
                    Permet aux nouveaux utilisateurs de s&apos;inscrire
                  </p>
                </div>
                <Switch
                  checked={settings.registrationOpen}
                  onCheckedChange={(v) => updateSetting('registrationOpen', v)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="minAge">Age minimum</Label>
                  <Input
                    id="minAge"
                    type="number"
                    min={18}
                    max={99}
                    value={settings.minAge}
                    onChange={(e) => updateSetting('minAge', parseInt(e.target.value) || 18)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxAge">Age maximum</Label>
                  <Input
                    id="maxAge"
                    type="number"
                    min={18}
                    max={120}
                    value={settings.maxAge}
                    onChange={(e) => updateSetting('maxAge', parseInt(e.target.value) || 99)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Verification email obligatoire</Label>
                  <p className="text-sm text-muted-foreground">
                    Les utilisateurs doivent verifier leur email avant d&apos;utiliser l&apos;app
                  </p>
                </div>
                <Switch
                  checked={settings.emailVerificationRequired}
                  onCheckedChange={(v) => updateSetting('emailVerificationRequired', v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MATCHING */}
        <TabsContent value="matching">
          <Card>
            <CardHeader>
              <CardTitle>Parametres de matching</CardTitle>
              <CardDescription>
                Configuration des preferences de recherche par defaut
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="defaultMaxDistance">Distance par defaut (km)</Label>
                  <Input
                    id="defaultMaxDistance"
                    type="number"
                    min={1}
                    max={1000}
                    value={settings.defaultMaxDistance}
                    onChange={(e) => updateSetting('defaultMaxDistance', parseInt(e.target.value) || 100)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Distance de recherche par defaut pour les nouveaux utilisateurs
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxDistanceLimit">Distance maximum autorisee (km)</Label>
                  <Input
                    id="maxDistanceLimit"
                    type="number"
                    min={1}
                    max={5000}
                    value={settings.maxDistanceLimit}
                    onChange={(e) => updateSetting('maxDistanceLimit', parseInt(e.target.value) || 500)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Distance maximale que les utilisateurs peuvent selectionner
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultAgeRange">Ecart d&apos;age par defaut</Label>
                <Input
                  id="defaultAgeRange"
                  type="number"
                  min={1}
                  max={50}
                  value={settings.defaultAgeRange}
                  onChange={(e) => updateSetting('defaultAgeRange', parseInt(e.target.value) || 10)}
                />
                <p className="text-sm text-muted-foreground">
                  Ecart d&apos;age par defaut pour la recherche (+/- cet age)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FEATURES */}
        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>
                Activer ou desactiver des fonctionnalites
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg border border-orange-300 bg-orange-50">
                <div className="space-y-0.5">
                  <Label className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    Mode maintenance
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Bloque l&apos;acces a l&apos;application pour tous les utilisateurs
                  </p>
                </div>
                <Switch
                  checked={settings.maintenanceMode}
                  onCheckedChange={(v) => updateSetting('maintenanceMode', v)}
                />
              </div>

              {settings.maintenanceMode && (
                <div className="space-y-2">
                  <Label htmlFor="maintenanceMessage">Message de maintenance</Label>
                  <Textarea
                    id="maintenanceMessage"
                    value={settings.maintenanceMessage}
                    onChange={(e) => updateSetting('maintenanceMessage', e.target.value)}
                    placeholder="Message affiche aux utilisateurs..."
                  />
                </div>
              )}

              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Premium</Label>
                    <p className="text-sm text-muted-foreground">
                      Activer les fonctionnalites premium
                    </p>
                  </div>
                  <Switch
                    checked={settings.premiumEnabled}
                    onCheckedChange={(v) => updateSetting('premiumEnabled', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Boost de profil</Label>
                    <p className="text-sm text-muted-foreground">
                      Permet aux utilisateurs de booster leur profil
                    </p>
                  </div>
                  <Switch
                    checked={settings.boostEnabled}
                    onCheckedChange={(v) => updateSetting('boostEnabled', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      Video Chat
                      <Badge variant="outline">Beta</Badge>
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Activer les appels video entre matches
                    </p>
                  </div>
                  <Switch
                    checked={settings.videoChatEnabled}
                    onCheckedChange={(v) => updateSetting('videoChatEnabled', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      Stories
                      <Badge variant="outline">Beta</Badge>
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Activer les stories ephemeres
                    </p>
                  </div>
                  <Switch
                    checked={settings.storiesEnabled}
                    onCheckedChange={(v) => updateSetting('storiesEnabled', v)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MESSAGES */}
        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle>Messages systeme</CardTitle>
              <CardDescription>
                Annonces et messages affiches aux utilisateurs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 p-4 rounded-lg border">
                <h3 className="font-semibold">Annonce globale</h3>
                <div className="space-y-2">
                  <Label htmlFor="globalAnnouncement">Message (vide = pas d&apos;annonce)</Label>
                  <Textarea
                    id="globalAnnouncement"
                    value={settings.globalAnnouncement}
                    onChange={(e) => updateSetting('globalAnnouncement', e.target.value)}
                    placeholder="Entrez une annonce a afficher a tous les utilisateurs..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="announcementType">Type d&apos;annonce</Label>
                  <Select
                    value={settings.announcementType}
                    onValueChange={(v) => updateSetting('announcementType', v)}
                  >
                    <SelectTrigger id="announcementType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">
                        <div className="flex items-center gap-2">
                          <Info className="h-4 w-4 text-blue-500" />
                          Information
                        </div>
                      </SelectItem>
                      <SelectItem value="success">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Succes
                        </div>
                      </SelectItem>
                      <SelectItem value="warning">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          Avertissement
                        </div>
                      </SelectItem>
                      <SelectItem value="error">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-500" />
                          Erreur
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {settings.globalAnnouncement && (
                  <div className={`p-3 rounded-lg border ${
                    settings.announcementType === 'info' ? 'bg-blue-50 border-blue-200 text-blue-800' :
                    settings.announcementType === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                    settings.announcementType === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                    'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <p className="text-sm font-medium">Apercu:</p>
                    <p className="text-sm">{settings.globalAnnouncement}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="welcomeMessage">Message de bienvenue</Label>
                <Textarea
                  id="welcomeMessage"
                  value={settings.welcomeMessage}
                  onChange={(e) => updateSetting('welcomeMessage', e.target.value)}
                  placeholder="Message affiche aux nouveaux inscrits..."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="termsUrl">URL Conditions d&apos;utilisation</Label>
                  <Input
                    id="termsUrl"
                    value={settings.termsUrl}
                    onChange={(e) => updateSetting('termsUrl', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="privacyUrl">URL Politique de confidentialite</Label>
                  <Input
                    id="privacyUrl"
                    value={settings.privacyUrl}
                    onChange={(e) => updateSetting('privacyUrl', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SÉCURITÉ */}
        <TabsContent value="security">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Parametres de securite</CardTitle>
                <CardDescription>
                  Configuration de la securite des comptes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="maxLoginAttempts">Tentatives de connexion max</Label>
                    <Input
                      id="maxLoginAttempts"
                      type="number"
                      min={1}
                      max={20}
                      value={settings.maxLoginAttempts}
                      onChange={(e) => updateSetting('maxLoginAttempts', parseInt(e.target.value) || 5)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Avant blocage temporaire du compte
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loginBlockDuration">Duree de blocage (minutes)</Label>
                    <Input
                      id="loginBlockDuration"
                      type="number"
                      min={1}
                      max={1440}
                      value={settings.loginBlockDuration}
                      onChange={(e) => updateSetting('loginBlockDuration', parseInt(e.target.value) || 15)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sessionExpirationHours">Expiration de session (heures)</Label>
                  <Input
                    id="sessionExpirationHours"
                    type="number"
                    min={1}
                    max={8760}
                    value={settings.sessionExpirationHours}
                    onChange={(e) => updateSetting('sessionExpirationHours', parseInt(e.target.value) || 168)}
                  />
                  <p className="text-sm text-muted-foreground">
                    168h = 7 jours. Les utilisateurs devront se reconnecter apres cette duree.
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Forcer HTTPS</Label>
                    <p className="text-sm text-muted-foreground">
                      Rediriger automatiquement vers HTTPS
                    </p>
                  </div>
                  <Switch
                    checked={settings.forceHttps}
                    onCheckedChange={(v) => updateSetting('forceHttps', v)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* System Info */}
            {systemInfo && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Informations systeme
                  </CardTitle>
                  <CardDescription>
                    Etat actuel du serveur (lecture seule)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Version</p>
                      <p className="text-lg font-semibold">{systemInfo.version}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Environnement</p>
                      <Badge variant={systemInfo.environment === 'production' ? 'default' : 'secondary'}>
                        {systemInfo.environment}
                      </Badge>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Base de donnees</p>
                      <div className="flex items-center gap-2">
                        {systemInfo.databaseStatus === 'connected' ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-green-600">Connectee</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-red-500" />
                            <span className="text-red-600">Deconnectee</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Uptime</p>
                      <p className="text-lg font-semibold">{formatUptime(systemInfo.uptime)}</p>
                    </div>
                  </div>
                  <div className="mt-4 p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Node.js</p>
                    <p className="font-mono text-sm">{systemInfo.nodeVersion}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
