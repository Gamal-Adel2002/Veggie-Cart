import React, { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useTranslation } from '@/lib/i18n';
import { Search } from 'lucide-react';
import { useAppDeliveryPersons, useAppCreateDeliveryPerson, useAppUpdateDeliveryPerson, useAppDeleteDeliveryPerson } from '@/hooks/use-auth-api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit } from 'lucide-react';
import type { DeliveryPerson } from '@workspace/api-client-react';

export default function DeliveryPersons() {
  const { data: persons } = useAppDeliveryPersons();
  const { mutateAsync: createDP } = useAppCreateDeliveryPerson();
  const { mutateAsync: updateDP } = useAppUpdateDeliveryPerson();
  const { mutateAsync: deleteDP } = useAppDeleteDeliveryPerson();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<DeliveryPerson | 'new' | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', active: true });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !persons) return persons || [];
    return persons.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.phone.toLowerCase().includes(q)
    );
  }, [persons, search]);

  const openEdit = (p: DeliveryPerson | 'new') => {
    setEditing(p);
    if (p === 'new') setFormData({ name: '', phone: '', active: true });
    else setFormData({ name: p.name, phone: p.phone, active: p.active });
  };

  const handleSave = async () => {
    if (editing === 'new') await createDP({ data: formData });
    else if (editing) await updateDP({ id: editing.id, data: formData });
    
    queryClient.invalidateQueries({ queryKey: ['/api/admin/delivery-persons'] });
    setEditing(null);
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Delivery Staff</h2>
        <Button onClick={() => openEdit('new')}><Plus className="w-4 h-4 me-2" /> Add Staff</Button>
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
              <TableHead>Name</TableHead>
              <TableHead>Phone (WhatsApp)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  {search ? 'No staff match your search.' : 'No delivery staff yet.'}
                </TableCell>
              </TableRow>
            )}
            {filtered.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.phone}</TableCell>
                <TableCell><Badge variant={p.active ? 'default' : 'secondary'}>{p.active ? 'Active' : 'Inactive'}</Badge></TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={async () => {
                    await deleteDP({ id: p.id });
                    queryClient.invalidateQueries({ queryKey: ['/api/admin/delivery-persons'] });
                  }}><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing === 'new' ? 'New Delivery Person' : 'Edit Staff'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-semibold">Name</label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
            <div><label className="text-sm font-semibold">Phone (include country code for WA)</label><Input value={formData.phone} placeholder="e.g. +20100000000" onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="active" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} />
              <label htmlFor="active" className="text-sm font-semibold">Active</label>
            </div>
            <Button onClick={handleSave} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
