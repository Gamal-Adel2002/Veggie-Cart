import React, { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPicker } from '@/components/MapPicker';
import { Plus, Pencil, Trash2, X, Check, MapPin, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAdminTranslation as useTranslation } from '@/lib/portalI18n';

interface DeliveryZone {
  id: number;
  name: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  active: boolean;
  createdAt: string;
}

interface ZoneFormData {
  name: string;
  centerLat: number | '';
  centerLng: number | '';
  radiusKm: number | '';
  active: boolean;
}

const emptyForm = (): ZoneFormData => ({ name: '', centerLat: '', centerLng: '', radiusKm: 5, active: true });

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export default function DeliveryZones() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ZoneFormData>(emptyForm());
  const [mapLoc, setMapLoc] = useState<{ latitude: number; longitude: number } | null>(null);

  const { data: zones = [], isLoading } = useQuery<DeliveryZone[]>({
    queryKey: ['admin-delivery-zones'],
    queryFn: () => apiFetch('/api/admin/delivery-zones'),
  });

  const filteredZones = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return zones;
    return zones.filter(z => z.name.toLowerCase().includes(q));
  }, [zones, search]);

  const createMutation = useMutation({
    mutationFn: (data: object) => apiFetch('/api/admin/delivery-zones', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-zones'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
      toast({ title: t('adminZoneCreated') });
      resetForm();
    },
    onError: (e: Error) => toast({ title: t('adminZoneFailCreate'), description: e.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) =>
      apiFetch(`/api/admin/delivery-zones/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-zones'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
      toast({ title: t('adminZoneUpdated') });
      resetForm();
    },
    onError: (e: Error) => toast({ title: t('adminZoneFailUpdate'), description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/admin/delivery-zones/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-zones'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
      toast({ title: t('adminZoneDeleted') });
    },
    onError: (e: Error) => toast({ title: t('adminZoneFailDelete'), description: e.message, variant: 'destructive' }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      apiFetch(`/api/admin/delivery-zones/${id}`, { method: 'PUT', body: JSON.stringify({ active }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-zones'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
    },
    onError: (e: Error) => toast({ title: t('adminZoneFailUpdate'), description: e.message, variant: 'destructive' }),
  });

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
    setMapLoc(null);
  }

  function startEdit(zone: DeliveryZone) {
    setEditingId(zone.id);
    setForm({ name: zone.name, centerLat: zone.centerLat, centerLng: zone.centerLng, radiusKm: zone.radiusKm, active: zone.active });
    setMapLoc({ latitude: zone.centerLat, longitude: zone.centerLng });
    setShowForm(true);
  }

  function handleMapChange(lat: number, lng: number) {
    setMapLoc({ latitude: lat, longitude: lng });
    setForm(f => ({ ...f, centerLat: lat, centerLng: lng }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      centerLat: Number(form.centerLat),
      centerLng: Number(form.centerLng),
      radiusKm: Number(form.radiusKm),
      active: form.active,
    };
    if (!payload.name || !Number.isFinite(payload.centerLat) || !Number.isFinite(payload.centerLng) || !Number.isFinite(payload.radiusKm) || payload.radiusKm <= 0) {
      toast({ title: t('adminZoneFillAll'), variant: 'destructive' });
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{t('adminDeliveryZones')}</h2>
          <p className="text-muted-foreground text-sm mt-1">{t('adminDeliveryZonesDesc')}</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" /> {t('adminZoneAddBtn')}
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="mb-6 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">{editingId ? t('adminZoneEdit') : t('adminZoneCreate')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('adminZoneName')}</Label>
                  <Input
                    required
                    placeholder={t('adminZoneNamePlaceholder')}
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('adminZoneRadius')}</Label>
                  <Input
                    required
                    type="number"
                    min="0.1"
                    step="0.1"
                    placeholder={t('adminZoneRadiusPlaceholder')}
                    value={form.radiusKm}
                    onChange={e => setForm(f => ({ ...f, radiusKm: parseFloat(e.target.value) || '' }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  {t('adminZoneCenterLoc')}
                  <span className="text-muted-foreground text-xs ms-1">{t('adminZoneCenterLocHint')}</span>
                </Label>
                <MapPicker
                  location={mapLoc}
                  onChange={handleMapChange}
                  previewCircle={
                    form.centerLat !== '' && form.centerLng !== '' && form.radiusKm !== ''
                      ? { lat: Number(form.centerLat), lng: Number(form.centerLng), radiusKm: Number(form.radiusKm) }
                      : null
                  }
                  className="mt-1"
                />
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t('adminZoneLatLabel')}</Label>
                    <Input
                      type="number"
                      step="0.00001"
                      placeholder={t('adminZoneLatPlaceholder')}
                      value={form.centerLat}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setForm(f => ({ ...f, centerLat: isNaN(val) ? '' : val }));
                        if (!isNaN(val) && form.centerLng !== '') {
                          setMapLoc({ latitude: val, longitude: Number(form.centerLng) });
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t('adminZoneLngLabel')}</Label>
                    <Input
                      type="number"
                      step="0.00001"
                      placeholder={t('adminZoneLngPlaceholder')}
                      value={form.centerLng}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setForm(f => ({ ...f, centerLng: isNaN(val) ? '' : val }));
                        if (!isNaN(val) && form.centerLat !== '') {
                          setMapLoc({ latitude: Number(form.centerLat), longitude: val });
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="zone-active"
                  checked={form.active}
                  onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                  className="w-4 h-4 rounded accent-primary"
                />
                <Label htmlFor="zone-active" className="cursor-pointer">{t('adminZoneActive')}</Label>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={isPending} className="gap-2">
                  <Check className="w-4 h-4" /> {editingId ? t('adminZoneSaveBtn') : t('adminZoneCreateBtn')}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} className="gap-2">
                  <X className="w-4 h-4" /> {t('adminZoneCancel')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <div className="relative mb-4">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('searchDeliveryZones')}
            className="ps-9"
          />
        </div>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">{t('adminZoneLoading')}</p>
      ) : filteredZones.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground font-medium">{search ? t('adminNoMatchDeliveryZones') : t('adminZoneEmpty')}</p>
            <p className="text-sm text-muted-foreground mt-1">{search ? '' : t('adminZoneEmptyDesc')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredZones.map(zone => (
            <Card key={zone.id} className={`transition-opacity ${!zone.active ? 'opacity-60' : ''}`}>
              <CardContent className="py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate">{zone.name}</p>
                      <Badge variant={zone.active ? 'default' : 'secondary'} className="text-xs">
                        {zone.active ? t('adminZoneStatusActive') : t('adminZoneStatusInactive')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('adminZoneRadiusInfo')(zone.radiusKm)} &bull; {zone.centerLat.toFixed(4)}, {zone.centerLng.toFixed(4)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8"
                    onClick={() => toggleMutation.mutate({ id: zone.id, active: !zone.active })}
                    disabled={toggleMutation.isPending}
                  >
                    {zone.active ? t('adminZoneDeactivateBtn') : t('adminZoneActivateBtn')}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(zone)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => { if (confirm(t('adminZoneDeleteConfirm')(zone.name))) deleteMutation.mutate(zone.id); }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
