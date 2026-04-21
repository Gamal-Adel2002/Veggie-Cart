import React, { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAdminTranslation as useTranslation } from '@/lib/portalI18n';
import { Search, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useStore } from '@/store';

interface DeliveryPerson {
  id: number;
  name: string;
  phone: string;
  active: boolean;
  username: string | null;
  createdAt: string;
}

interface FormData {
  name: string;
  phone: string;
  active: boolean;
  username: string;
  password: string;
}

async function apiFetch(path: string, adminToken: string | null, options?: RequestInit) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
  const res = await fetch(path, {
    ...options,
    headers: { ...headers, ...(options?.headers || {}) },
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export default function DeliveryPersons() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { toast } = useToast();
  const adminToken = useStore(s => s.token);

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<DeliveryPerson | 'new' | null>(null);
  const [formData, setFormData] = useState<FormData>({ name: '', phone: '', active: true, username: '', password: '' });

  const { data: persons = [], isLoading: personsLoading } = useQuery<DeliveryPerson[]>({
    queryKey: ['/api/admin/delivery-persons'],
    queryFn: () => apiFetch('/api/admin/delivery-persons', adminToken),
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => apiFetch('/api/admin/delivery-persons', adminToken, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/admin/delivery-persons'] }); setEditing(null); },
    onError: (e: Error) => toast({ title: t('adminError'), description: e.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: FormData }) =>
      apiFetch(`/api/admin/delivery-persons/${id}`, adminToken, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/admin/delivery-persons'] }); setEditing(null); },
    onError: (e: Error) => toast({ title: t('adminError'), description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/admin/delivery-persons/${id}`, adminToken, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/admin/delivery-persons'] }),
    onError: (e: Error) => toast({ title: t('adminError'), description: e.message, variant: 'destructive' }),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return persons;
    return persons.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.phone.toLowerCase().includes(q) ||
      (p.username || '').toLowerCase().includes(q)
    );
  }, [persons, search]);

  const openEdit = (p: DeliveryPerson | 'new') => {
    setEditing(p);
    if (p === 'new') {
      setFormData({ name: '', phone: '', active: true, username: '', password: '' });
    } else {
      setFormData({ name: p.name, phone: p.phone, active: p.active, username: p.username || '', password: '' });
    }
  };

  const handleSave = async () => {
    if (editing === 'new') {
      createMutation.mutate(formData);
    } else if (editing) {
      updateMutation.mutate({ id: editing.id, data: formData });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">{t('adminDPNewStaff')}</h2>
        <Button onClick={() => openEdit('new')}><Plus className="w-4 h-4 me-2" /> {t('adminDPNewStaff')}</Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('searchDeliveryStaff')}
          className="ps-9"
        />
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('adminNameCol')}</TableHead>
              <TableHead>{t('adminPhoneCol')}</TableHead>
              <TableHead>{t('adminDPUsernameCol')}</TableHead>
              <TableHead>{t('adminDPStatusCol')}</TableHead>
              <TableHead>{t('adminActionsCol')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {personsLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t('adminLoading')}</TableCell>
              </TableRow>
            )}
            {!personsLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {search ? t('adminNoMatchDeliveryStaff') : t('adminEmptyDeliveryStaff')}
                </TableCell>
              </TableRow>
            )}
            {!personsLoading && filtered.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.phone}</TableCell>
                <TableCell>
                  {p.username
                    ? <span className="font-mono text-sm text-muted-foreground">{p.username}</span>
                    : <span className="flex items-center gap-1 text-amber-500 text-xs"><AlertTriangle className="w-3 h-3" /> —</span>
                  }
                </TableCell>
                <TableCell>
                  <Badge variant={p.active ? 'default' : 'secondary'}>
                    {p.active ? t('adminZoneStatusActive') : t('adminZoneStatusInactive')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(p.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? t('adminDPNewStaff') : t('adminDPEditStaff')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold">{t('adminNameLabel')}</label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="text-sm font-semibold">{t('adminPhoneLabel')} (WhatsApp)</label>
              <Input value={formData.phone} placeholder="+20100000000" onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="dp-active" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} />
              <label htmlFor="dp-active" className="text-sm font-semibold">{t('adminZoneStatusActive')}</label>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-sm font-semibold mb-3 text-muted-foreground">{t('adminDPPortalCredentials')}</p>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-semibold">{t('adminDPUsername')}</label>
                  <Input
                    value={formData.username}
                    placeholder={t('adminDPUsernamePlaceholder')}
                    onChange={e => setFormData({...formData, username: e.target.value})}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold">{t('adminDPPassword')}</label>
                  <Input
                    type="password"
                    value={formData.password}
                    placeholder={editing === 'new' ? t('adminDPPasswordPlaceholder') : t('adminDPPasswordKeepBlank')}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              {editing !== 'new' && !formData.username && (
                <p className="text-amber-500 text-xs mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {t('adminDPCredentialsMissing')}
                </p>
              )}
            </div>

            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              {isSaving ? t('adminSaving') : t('adminSaveChanges')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
