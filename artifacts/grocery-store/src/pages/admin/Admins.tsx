import React, { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useTranslation as useI18n } from '@/lib/i18n';
import { Search } from 'lucide-react';
import { useAppAdmins, useAppCreateAdmin, useAppUpdateAdmin } from '@/hooks/use-auth-api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { type User } from '@workspace/api-client-react';
import { getErrorMessage } from '@/lib/utils';

type DialogMode = 'new' | 'edit';

interface FormData {
  name: string;
  phone: string;
  password: string;
}

export default function Admins() {
  const { data: admins, isLoading } = useAppAdmins();
  const { mutateAsync: createAdmin } = useAppCreateAdmin();
  const { mutateAsync: updateAdmin } = useAppUpdateAdmin();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useI18n();

  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<DialogMode | null>(null);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [formData, setFormData] = useState<FormData>({ name: '', phone: '', password: '' });
  const [saving, setSaving] = useState(false);

  const filteredAdmins = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !admins) return admins || [];
    return admins.filter((a) =>
      a.name.toLowerCase().includes(q) ||
      a.phone.toLowerCase().includes(q)
    );
  }, [admins, search]);

  const openNew = () => {
    setMode('new');
    setEditTarget(null);
    setFormData({ name: '', phone: '', password: '' });
  };

  const openEdit = (admin: User) => {
    setMode('edit');
    setEditTarget(admin);
    setFormData({ name: admin.name, phone: admin.phone, password: '' });
  };

  const closeDialog = () => {
    setMode(null);
    setEditTarget(null);
  };

  const handleSave = async () => {
    if (mode === 'new') {
      if (!formData.name.trim() || !formData.phone.trim() || !formData.password.trim()) {
        toast({ title: "Validation Error", description: "Name, phone, and password are all required.", variant: "destructive" });
        return;
      }
    }

    setSaving(true);
    try {
      if (mode === 'new') {
        await createAdmin({ data: { name: formData.name, phone: formData.phone, password: formData.password } });
        toast({ title: "Admin Created", description: `${formData.name} can now log in as an admin.` });
      } else if (mode === 'edit' && editTarget) {
        const payload: { name?: string; phone?: string; password?: string } = {};
        if (formData.name.trim()) payload.name = formData.name.trim();
        if (formData.phone.trim()) payload.phone = formData.phone.trim();
        if (formData.password.trim()) payload.password = formData.password.trim();
        await updateAdmin({ id: editTarget.id, data: payload });
        toast({ title: "Admin Updated", description: "Changes saved successfully." });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/admin/admins'] });
      closeDialog();
    } catch (e: unknown) {
      toast({ title: "Error", description: getErrorMessage(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Admin Accounts</h2>
        <Button onClick={openNew}><Plus className="w-4 h-4 me-2" /> Add Admin</Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('searchAdmins')}
          className="ps-9"
        />
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading…</TableCell>
              </TableRow>
            )}
            {!isLoading && filteredAdmins.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  {search ? t('adminNoMatchAdmins') : t('adminEmptyAdmins')}
                </TableCell>
              </TableRow>
            )}
            {filteredAdmins.map((admin) => (
              <TableRow key={admin.id}>
                <TableCell className="font-medium">{admin.name}</TableCell>
                <TableCell>{admin.phone}</TableCell>
                <TableCell>{format(new Date(admin.createdAt), 'MMM dd, yyyy')}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(admin)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={mode !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mode === 'new' ? 'Add New Admin' : `Edit Admin — ${editTarget?.name}`}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-semibold block mb-1">Name</label>
              <Input
                value={formData.name}
                placeholder="Full name"
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-semibold block mb-1">Phone</label>
              <Input
                value={formData.phone}
                placeholder="e.g. 01012345678"
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-semibold block mb-1">
                Password{mode === 'edit' && <span className="text-muted-foreground font-normal"> (leave blank to keep current)</span>}
              </label>
              <Input
                type="password"
                value={formData.password}
                placeholder={mode === 'new' ? 'Password' : 'New password (optional)'}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <Button onClick={handleSave} className="w-full" disabled={saving}>
              {saving ? 'Saving…' : mode === 'new' ? 'Create Admin' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
