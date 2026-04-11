import React, { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAppSuppliers, useAppCreateSupplier, useAppUpdateSupplier, useAppDeleteSupplier } from '@/hooks/use-auth-api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Search, Loader2, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';
import { useAdminTranslation } from '@/lib/portalI18n';
import type { Supplier } from '@workspace/api-client-react';

interface FormData { name: string; phone: string; address: string; }

export default function Suppliers() {
  const { data: suppliers, isLoading } = useAppSuppliers();
  const { mutateAsync: createSupplier } = useAppCreateSupplier();
  const { mutateAsync: updateSupplier } = useAppUpdateSupplier();
  const { mutateAsync: deleteSupplier } = useAppDeleteSupplier();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useAdminTranslation();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Supplier | null>(null);
  const [form, setForm] = useState<FormData>({ name: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !suppliers) return suppliers || [];
    return suppliers.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q) ||
      (s.address || '').toLowerCase().includes(q)
    );
  }, [suppliers, search]);

  const openNew = () => {
    setEditTarget(null);
    setForm({ name: '', phone: '', address: '' });
    setDialogOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditTarget(s);
    setForm({ name: s.name, phone: s.phone || '', address: s.address || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: t('nameRequired'), description: t('adminSuppliersNameEmpty'), variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editTarget) {
        await updateSupplier({ id: editTarget.id, data: { name: form.name.trim(), phone: form.phone.trim() || undefined, address: form.address.trim() || undefined } });
        toast({ title: t('adminSuppliersUpdated') });
      } else {
        await createSupplier({ data: { name: form.name.trim(), phone: form.phone.trim() || undefined, address: form.address.trim() || undefined } });
        toast({ title: t('adminSuppliersCreated') });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/admin/suppliers'] });
      setDialogOpen(false);
    } catch (e) {
      toast({ title: t('adminOrderError'), description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSupplier({ id: deleteTarget.id });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/suppliers'] });
      toast({ title: t('adminSuppliersDeleted') });
    } catch (e) {
      toast({ title: t('adminOrderError'), description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" /> {t('adminSuppliersTitle')}
        </h2>
        <Button onClick={openNew}><Plus className="w-4 h-4 me-2" /> {t('adminSuppliersAdd')}</Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('adminSuppliersSearch')} className="ps-9" />
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('adminNameCol')}</TableHead>
              <TableHead>{t('adminPhoneCol')}</TableHead>
              <TableHead>{t('adminSuppliersAddress')}</TableHead>
              <TableHead>{t('adminSuppliersAdded')}</TableHead>
              <TableHead>{t('adminActionsCol')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t('adminLoading')}</TableCell></TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                {search ? t('adminSuppliersNoMatch') : t('adminSuppliersEmpty')}
              </TableCell></TableRow>
            )}
            {filtered.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="text-muted-foreground">{s.phone || '—'}</TableCell>
                <TableCell className="text-muted-foreground max-w-xs truncate">{s.address || '—'}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{format(new Date(s.createdAt), 'MMM dd, yyyy')}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(s)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) setDialogOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? t('adminSuppliersEditTitle')(editTarget.name) : t('adminSuppliersAdd')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div>
              <label className="text-sm font-semibold block mb-1">{t('adminNameLabel')} *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Cairo Fresh Farms" />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-1">{t('adminPhoneLabel')}</label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder={t('adminPhonePlaceholder')} />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-1">{t('adminSuppliersAddress')}</label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="e.g. 12 Agri Zone, Giza" />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('adminZoneCancel')}</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editTarget ? t('adminSaveChanges') : t('adminSuppliersCreate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('adminSuppliersDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? t('adminSuppliersDeleteConfirm')(deleteTarget.name) : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('adminZoneCancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('adminCustomerDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
