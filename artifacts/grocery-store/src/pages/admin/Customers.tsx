import React, { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n';
import { Edit, Trash2, Search, Users, KeyRound } from 'lucide-react';
import { format } from 'date-fns';
import { getErrorMessage } from '@/lib/utils';

interface Customer {
  id: number;
  name: string;
  phone: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  profileImage: string | null;
  createdAt: string;
  orderCount: number;
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

export default function Customers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['admin-customers'],
    queryFn: () => apiFetch('/api/admin/customers'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/admin/customers/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      toast({ title: t('adminCustomerDeleted') });
      setDeleteTarget(null);
    },
    onError: (e: Error) => {
      toast({ title: t('adminCustomerDeleteFail'), description: e.message, variant: 'destructive' });
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setFormData({ name: customer.name, phone: customer.phone, address: customer.address || '' });
    setNewPassword('');
    setConfirmPassword('');
  };

  const closeEdit = () => {
    setEditing(null);
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSaveProfile = async () => {
    if (!editing) return;
    const EGYPTIAN_PHONE = /^0(10|11|12|15)\d{8}$/;
    if (formData.phone.trim() && !EGYPTIAN_PHONE.test(formData.phone.trim())) {
      toast({ title: "Invalid Phone", description: "Phone must start with 010, 011, 012, or 015 and be exactly 11 digits.", variant: 'destructive' });
      return;
    }
    setSavingProfile(true);
    try {
      await apiFetch(`/api/admin/customers/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: formData.name.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          address: formData.address,
        }),
      });
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      toast({ title: t('adminCustomerSaved'), description: t('adminCustomerSavedDesc') });
      closeEdit();
    } catch (e: unknown) {
      toast({ title: t('adminCustomerSaveFail'), description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleResetPassword = async () => {
    if (!editing) return;
    if (newPassword.length < 6) {
      toast({ title: t('adminCustomerPasswordMin'), variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: t('adminCustomerPasswordMismatch'), variant: 'destructive' });
      return;
    }
    setSavingPassword(true);
    try {
      await apiFetch(`/api/admin/customers/${editing.id}/reset-password`, {
        method: 'PUT',
        body: JSON.stringify({ newPassword }),
      });
      toast({ title: t('adminCustomerPasswordReset') });
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: unknown) {
      toast({ title: t('adminCustomerPasswordResetFail'), description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-bold">{t('adminCustomers')}</h2>
          <p className="text-muted-foreground text-sm mt-1">{t('adminCustomersDesc')}</p>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          <Users className="w-3.5 h-3.5 me-1.5" />
          {customers.length}
        </Badge>
      </div>

      <div className="relative mb-4">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('searchCustomers')}
          className="ps-9"
        />
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('adminCustomerIdCol')}</TableHead>
              <TableHead>{t('adminCustomerName')}</TableHead>
              <TableHead>{t('adminCustomerPhone')}</TableHead>
              <TableHead>{t('adminCustomerAddress')}</TableHead>
              <TableHead>{t('adminCustomerOrders')}</TableHead>
              <TableHead>{t('adminCustomerJoined')}</TableHead>
              <TableHead>{t('adminCustomerActionsCol')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {t('adminCustomerLoading')}
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {search ? t('adminCustomerNoResults') : t('adminCustomerEmpty')}
                </TableCell>
              </TableRow>
            )}
            {filtered.map(customer => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium text-muted-foreground">#{customer.id}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {customer.profileImage ? (
                      <img src={customer.profileImage} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                        {customer.name[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium">{customer.name}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">{customer.phone}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                  {customer.address || '—'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{customer.orderCount}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(customer.createdAt), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(customer)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(customer)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('adminCustomerEdit')} — {editing?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-semibold block mb-1">{t('adminCustomerName')}</label>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('adminCustomerName')}
              />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-1">{t('adminCustomerPhone')}</label>
              <Input
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder={t('adminCustomerPhonePlaceholder')}
              />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-1">{t('adminCustomerAddress')}</label>
              <Input
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder={t('adminCustomerAddressPlaceholder')}
              />
            </div>

            <Button onClick={handleSaveProfile} disabled={savingProfile} className="w-full">
              {savingProfile ? t('adminCustomerSaving') : t('adminCustomerSave')}
            </Button>

            <div className="border-t border-border pt-4">
              <div className="flex items-center gap-2 mb-3">
                <KeyRound className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold">{t('adminCustomerResetPassword')}</span>
              </div>
              <div className="space-y-2">
                <Input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder={t('adminCustomerNewPassword')}
                />
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder={t('adminCustomerConfirmPassword')}
                />
              </div>
              <Button
                variant="outline"
                onClick={handleResetPassword}
                disabled={savingPassword || !newPassword}
                className="w-full mt-2"
              >
                {savingPassword ? t('adminCustomerResetting') : t('adminCustomerResetPassword')}
              </Button>
            </div>

            <div className="border-t border-border pt-4">
              <Button
                variant="destructive"
                onClick={() => { closeEdit(); setDeleteTarget(editing); }}
                className="w-full"
              >
                <Trash2 className="w-4 h-4 me-2" />
                {t('adminCustomerDelete')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('adminCustomerDelete')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            {t('adminCustomerDeleteConfirm')(deleteTarget?.name || '')}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1">
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="flex-1">
              {deleting ? t('adminCustomerDeleting') : t('adminCustomerDelete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
