'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Plus, Trash2, Users, Loader2, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Condition {
  id: string;
  field: string;
  operator: string;
  value: string | string[] | number | boolean;
}

interface SegmentConditions {
  operator: 'AND' | 'OR';
  conditions: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
}

const AVAILABLE_FIELDS = [
  { value: 'gender', label: 'Genre', type: 'select', options: ['MALE', 'FEMALE', 'OTHER'] },
  { value: 'age', label: 'Age', type: 'number' },
  { value: 'region', label: 'Region', type: 'text' },
  { value: 'department', label: 'Departement', type: 'text' },
  { value: 'isPremium', label: 'Compte Premium', type: 'boolean' },
  { value: 'emailVerified', label: 'Email verifie', type: 'boolean' },
  { value: 'accountStatus', label: 'Statut du compte', type: 'select', options: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED'] },
  { value: 'createdAt', label: 'Date inscription', type: 'date' },
  { value: 'lastSeen', label: 'Derniere connexion', type: 'date' },
  { value: 'totalMatches', label: 'Nombre de matchs', type: 'number' },
  { value: 'totalLikesReceived', label: 'Likes recus', type: 'number' },
  { value: 'totalLikesSent', label: 'Likes envoyes', type: 'number' },
  { value: 'lookingFor', label: 'Recherche', type: 'select', options: ['RELATIONSHIP', 'FRIENDSHIP', 'CASUAL', 'MARRIAGE'] },
  { value: 'maritalStatus', label: 'Statut marital', type: 'select', options: ['SINGLE', 'DIVORCED', 'WIDOWED', 'SEPARATED'] },
];

const OPERATORS = {
  text: [
    { value: 'equals', label: 'Est egal a' },
    { value: 'notEquals', label: 'N\'est pas egal a' },
    { value: 'contains', label: 'Contient' },
    { value: 'startsWith', label: 'Commence par' },
  ],
  number: [
    { value: 'equals', label: 'Est egal a' },
    { value: 'notEquals', label: 'N\'est pas egal a' },
    { value: 'greaterThan', label: 'Superieur a' },
    { value: 'lessThan', label: 'Inferieur a' },
    { value: 'between', label: 'Entre' },
  ],
  select: [
    { value: 'equals', label: 'Est' },
    { value: 'notEquals', label: 'N\'est pas' },
    { value: 'in', label: 'Est parmi' },
  ],
  boolean: [
    { value: 'equals', label: 'Est' },
  ],
  date: [
    { value: 'before', label: 'Avant le' },
    { value: 'after', label: 'Apres le' },
    { value: 'olderThan', label: 'Il y a plus de' },
    { value: 'newerThan', label: 'Il y a moins de' },
  ],
};

export default function EditSegmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [counting, setCounting] = useState(false);
  const [userCount, setUserCount] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logicalOperator: 'AND' as 'AND' | 'OR',
    isActive: true,
  });

  const [conditions, setConditions] = useState<Condition[]>([]);

  useEffect(() => {
    fetchSegment();
  }, [id]);

  const fetchSegment = async () => {
    try {
      const res = await fetch(`/api/admin/email-marketing/segments/${id}`);
      const data = await res.json();

      if (data.segment) {
        const segment = data.segment;
        const segmentConditions = segment.conditions as SegmentConditions;

        setFormData({
          name: segment.name,
          description: segment.description || '',
          logicalOperator: segmentConditions?.operator || 'AND',
          isActive: segment.isActive,
        });

        // Convert conditions from JSON to state format
        if (segmentConditions?.conditions) {
          setConditions(
            segmentConditions.conditions.map((c: any) => ({
              id: crypto.randomUUID(),
              field: c.field,
              operator: c.operator,
              value: c.value,
            }))
          );
        } else {
          setConditions([{ id: crypto.randomUUID(), field: '', operator: '', value: '' }]);
        }

        setUserCount(segment.cachedCount);
      }
    } catch (error) {
      console.error('Error fetching segment:', error);
      toast.error('Erreur lors du chargement du segment');
    } finally {
      setLoading(false);
    }
  };

  const getFieldType = (fieldValue: string) => {
    const field = AVAILABLE_FIELDS.find(f => f.value === fieldValue);
    return field?.type || 'text';
  };

  const getFieldOptions = (fieldValue: string) => {
    const field = AVAILABLE_FIELDS.find(f => f.value === fieldValue);
    return field?.options || [];
  };

  const addCondition = () => {
    setConditions([
      ...conditions,
      { id: crypto.randomUUID(), field: '', operator: '', value: '' },
    ]);
  };

  const removeCondition = (conditionId: string) => {
    if (conditions.length > 1) {
      setConditions(conditions.filter(c => c.id !== conditionId));
    }
  };

  const updateCondition = (conditionId: string, updates: Partial<Condition>) => {
    setConditions(conditions.map(c =>
      c.id === conditionId ? { ...c, ...updates } : c
    ));
  };

  const buildConditionsJson = () => {
    const validConditions = conditions.filter(c => c.field && c.operator && c.value !== '');
    if (validConditions.length === 0) return null;

    return {
      operator: formData.logicalOperator,
      conditions: validConditions.map(c => ({
        field: c.field,
        operator: c.operator,
        value: c.value,
      })),
    };
  };

  const handleRecountUsers = async () => {
    setCounting(true);
    try {
      const res = await fetch(`/api/admin/email-marketing/segments/${id}/count`, {
        method: 'POST',
      });

      const data = await res.json();

      if (data.success) {
        setUserCount(data.count);
        toast.success(`${data.count} utilisateur(s) correspondent`);
      } else {
        toast.error(data.error || 'Erreur lors du comptage');
      }
    } catch (error) {
      console.error('Error counting:', error);
      toast.error('Erreur lors du comptage');
    } finally {
      setCounting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const conditionsJson = buildConditionsJson();
    if (!conditionsJson) {
      toast.error('Ajoutez au moins une condition valide');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/admin/email-marketing/segments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          conditions: conditionsJson,
          isActive: formData.isActive,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Segment mis a jour');
        router.push('/admin/email-marketing/segments');
      } else {
        toast.error(data.error || 'Erreur lors de la mise a jour');
      }
    } catch (error) {
      console.error('Error updating segment:', error);
      toast.error('Erreur lors de la mise a jour');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Etes-vous sur de vouloir supprimer ce segment ?')) {
      return;
    }

    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/email-marketing/segments/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Segment supprime');
        router.push('/admin/email-marketing/segments');
      } else {
        toast.error(data.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Error deleting segment:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/email-marketing/segments">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-xl font-semibold">Modifier le segment</h2>
            <p className="text-sm text-muted-foreground">{formData.name}</p>
          </div>
        </div>
        <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du segment *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isActive">Segment actif</Label>
                <p className="text-xs text-muted-foreground">Visible lors de la creation de campagne</p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Conditions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Conditions</CardTitle>
              <Select
                value={formData.logicalOperator}
                onValueChange={(value: 'AND' | 'OR') => setFormData({ ...formData, logicalOperator: value })}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">Toutes les conditions (ET)</SelectItem>
                  <SelectItem value="OR">Au moins une (OU)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {conditions.map((condition) => {
              const fieldType = getFieldType(condition.field);
              const operators = OPERATORS[fieldType as keyof typeof OPERATORS] || OPERATORS.text;
              const options = getFieldOptions(condition.field);

              return (
                <div key={condition.id} className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <Select
                      value={condition.field}
                      onValueChange={(value) => updateCondition(condition.id, { field: value, operator: '', value: '' })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Champ" />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_FIELDS.map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={condition.operator}
                      onValueChange={(value) => updateCondition(condition.id, { operator: value })}
                      disabled={!condition.field}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Operateur" />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {fieldType === 'boolean' ? (
                      <Select
                        value={String(condition.value)}
                        onValueChange={(value) => updateCondition(condition.id, { value: value === 'true' })}
                        disabled={!condition.operator}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Valeur" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Oui</SelectItem>
                          <SelectItem value="false">Non</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : fieldType === 'select' && options.length > 0 ? (
                      <Select
                        value={String(condition.value)}
                        onValueChange={(value) => updateCondition(condition.id, { value })}
                        disabled={!condition.operator}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Valeur" />
                        </SelectTrigger>
                        <SelectContent>
                          {options.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : fieldType === 'number' ? (
                      <Input
                        type="number"
                        value={String(condition.value)}
                        onChange={(e) => updateCondition(condition.id, { value: parseInt(e.target.value) || 0 })}
                        placeholder="Valeur"
                        disabled={!condition.operator}
                      />
                    ) : (
                      <Input
                        value={String(condition.value)}
                        onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                        placeholder="Valeur"
                        disabled={!condition.operator}
                      />
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCondition(condition.id)}
                    disabled={conditions.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}

            <Button type="button" variant="outline" onClick={addCondition} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une condition
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Utilisateurs correspondants</p>
                  <p className="text-sm text-muted-foreground">
                    {userCount !== null ? `${userCount.toLocaleString()} utilisateur(s)` : 'Cliquez pour compter'}
                  </p>
                </div>
              </div>
              <Button type="button" variant="outline" onClick={handleRecountUsers} disabled={counting}>
                {counting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Recompter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/email-marketing/segments">Annuler</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer
          </Button>
        </div>
      </form>
    </div>
  );
}
