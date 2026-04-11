import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAdminTranslation as useTranslation } from '@/lib/portalI18n';
import { Tag, Search, Edit, Trash2, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { getErrorMessage } from '@/lib/utils';

const PROMO_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generatePromoCode(length = 8): string {
  return Array.from({ length }, () => PROMO_CHARS[Math.floor(Math.random() * PROMO_CHARS.length)]).join('');
}

interface PromoCode {
  id: number;
  code: string;
  discountType: 'percentage' | 'amount';
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  validFrom: string | null;
  validUntil: string | null;
  createdAt: string;
}

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

export default function PromoCodes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PromoCode | null>(null);
  const [loading, setLoading] = useState(false);
  const [unlimited, setUnlimited] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percentage' as 'percentage' | 'amount',
    discountValue: '15',
    maxUses: '',
    active: true,
    validFrom: '',
    validUntil: '',
  });

  const { data: promos = [], isLoading } = useQuery<PromoCode[]>({
    queryKey: ['admin-promo-codes'],
    queryFn: () => apiFetch('/api/admin/promo-codes'),
  });

  const filtered = search.trim()
    ? promos.filter(p => p.code.toLowerCase().includes(search.trim().toLowerCase()))
    : promos;

  const openCreate = () => {
    setEditing(null);
    setFormData({
      code: '',
      discountType: 'percentage',
      discountValue: '15',
      maxUses: '',
      active: true,
      validFrom: '',
      validUntil: '',
    });
    setUnlimited(false);
    setDialogOpen(true);
  };

  const openEdit = (promo: PromoCode) => {
    setEditing(promo);
    setFormData({
      code: promo.code,
      discountType: promo.discountType,
      discountValue: String(promo.discountValue),
      maxUses: promo.maxUses != null ? String(promo.maxUses) : '',
      active: promo.active,
      validFrom: promo.validFrom ? promo.validFrom.slice(0, 16) : '',
      validUntil: promo.validUntil ? promo.validUntil.slice(0, 16) : '',
    });
    setUnlimited(promo.maxUses === null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        code: formData.code.trim() || undefined,
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        active: formData.active,
      };
      if (!unlimited && formData.maxUses.trim()) {
        body.maxUses = Number(formData.maxUses);
      }
      if (formData.validFrom) body.validFrom = formData.validFrom;
      if (formData.validUntil) body.validUntil = formData.validUntil;

      if (editing) {
        await apiFetch(`/api/admin/promo-codes/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        toast({ title: t('adminPromoUpdated') });
      } else {
        await apiFetch('/api/admin/promo-codes', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        toast({ title: t('adminPromoCreated') });
      }
      queryClient.invalidateQueries({ queryKey: ['admin-promo-codes'] });
      setDialogOpen(false);
    } catch (e: unknown) {
      toast({ title: t('adminPromoError'), description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/admin/promo-codes/${deleteTarget.id}`, { method: 'DELETE' });
      queryClient.invalidateQueries({ queryKey: ['admin-promo-codes'] });
      toast({ title: t('adminPromoDeleted') });
    } catch (e: unknown) {
      toast({ title: t('adminPromoError'), description: getErrorMessage(e), variant: 'destructive' });
    }
    setDeleteTarget(null);
  };

  const handleToggleActive = async (promo: PromoCode) => {
    try {
      await apiFetch(`/api/admin/promo-codes/${promo.id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: !promo.active }),
      });
      queryClient.invalidateQueries({ queryKey: ['admin-promo-codes'] });
    } catch (e: unknown) {
      toast({ title: t('adminPromoError'), description: getErrorMessage(e), variant: 'destructive' });
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">{t('adminPromoCodes')}</h2>
          <p className="text-muted-foreground text-sm mt-1">{t('adminPromoDesc')}</p>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          <Tag className="w-3.5 h-3.5 me-1.5" />
          {promos.length}
        </Badge>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('adminPromoSearch')} className="ps-9" />
        </div>
        <Button onClick={openCreate}><Sparkles className="w-4 h-4 me-1" />{t('adminPromoAdd')}</Button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('adminPromoCodeCol')}</TableHead>
              <TableHead>{t('adminPromoTypeCol')}</TableHead>
              <TableHead>{t('adminPromoValueCol')}</TableHead>
              <TableHead>{t('adminPromoMaxUsesCol')}</TableHead>
              <TableHead>{t('adminPromoUsedCol')}</TableHead>
              <TableHead>{t('adminPromoStatusCol')}</TableHead>
              <TableHead>{t('adminPromoValidFromCol')}</TableHead>
              <TableHead>{t('adminPromoValidUntilCol')}</TableHead>
              <TableHead>{t('adminPromoActionsCol')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{t('adminLoading')}</TableCell></TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{search ? t('adminNoMatch') : t('adminPromoEmpty')}</TableCell></TableRow>
            )}
            {filtered.map(promo => (
              <TableRow key={promo.id}>
                <TableCell><code className="bg-muted px-2 py-0.5 rounded font-mono text-sm">{promo.code}</code></TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {promo.discountType === 'percentage' ? t('adminPromoPct') : t('adminPromoAmt')}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">
                  {promo.discountType === 'percentage' ? `${promo.discountValue}%` : `${promo.discountValue} ${t('adminCurrencyLabel')}`}
                </TableCell>
                <TableCell>{promo.maxUses ?? <span className="text-muted-foreground">{t('adminPromoUnlimited')}</span>}</TableCell>
                <TableCell><Badge variant="secondary">{promo.usedCount}</Badge></TableCell>
                <TableCell>
                  <Button variant={promo.active ? 'default' : 'outline'} size="sm" className={`h-7 text-xs ${!promo.active ? 'border-red-300 text-red-500 hover:bg-red-50' : ''}`} onClick={() => handleToggleActive(promo)}>
                    {promo.active ? t('adminPromoActive') : t('adminPromoInactive')}
                  </Button>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{promo.validFrom ? format(new Date(promo.validFrom), 'MMM dd, yyyy HH:mm') : <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{promo.validUntil ? format(new Date(promo.validUntil), 'MMM dd, yyyy HH:mm') : <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(promo)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(promo)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) setDialogOpen(false); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t('adminPromoEdit') : t('adminPromoCreate')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-semibold block mb-1">{t('adminPromoCodeLabel')}</label>
              <div className="flex gap-2">
                <Input value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} placeholder={t('adminPromoCodeHint')} />
                <Button type="button" variant="outline" size="sm" onClick={() => setFormData({...formData, code: generatePromoCode()})}><Sparkles className="w-3.5 h-3.5" /></Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t('adminPromoCodeHint')}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold block mb-1">{t('adminPromoTypeLabel')}</label>
                <Select value={formData.discountType} onValueChange={(v: 'percentage' | 'amount') => setFormData({...formData, discountType: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">{t('adminPromoPct')}</SelectItem>
                    <SelectItem value="amount">{t('adminPromoAmt')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-semibold block mb-1">{formData.discountType === 'percentage' ? t('adminPromoPctCol') : t('adminPromoAmtCol')}</label>
                <Input type="number" min="0" step="0.01" value={formData.discountValue} onChange={e => setFormData({...formData, discountValue: e.target.value})} placeholder={formData.discountType === 'percentage' ? '15' : '100'} />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold block mb-1">{t('adminPromoMaxUsesLabel')}</label>
              <div className="flex items-center gap-2">
                <Checkbox id="unlimited" checked={unlimited} onCheckedChange={c => setUnlimited(c === true)} />
                <label htmlFor="unlimited" className="text-sm">{t('adminPromoUnlimited')}</label>
              </div>
              {!unlimited && (
                <Input type="number" min="1" className="mt-2" placeholder={t('adminPromoMaxUsesPlaceholder')} value={formData.maxUses} onChange={e => setFormData({...formData, maxUses: e.target.value})} />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold block mb-1">{t('adminPromoValidFrom')}</label>
                <Input type="datetime-local" value={formData.validFrom} onChange={e => setFormData({...formData, validFrom: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-semibold block mb-1">{t('adminPromoValidUntil')}</label>
                <Input type="datetime-local" value={formData.validUntil} onChange={e => setFormData({...formData, validUntil: e.target.value})} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="active" checked={formData.active} onCheckedChange={c => setFormData({...formData, active: c === true})} />
              <label htmlFor="active" className="text-sm font-medium">{t('adminPromoActive')}</label>
            </div>

            <Button onClick={handleSave} disabled={loading} className="w-full">
              {loading ? t('adminSaving') : (editing ? t('adminSaveChanges') : t('adminPromoCreateBtn'))}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t('adminPromoDelete')}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">{t('adminPromoDeleteConfirm')(deleteTarget?.code || '')}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1">{t('cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete} className="flex-1">{t('adminPromoDelete')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
