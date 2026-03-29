import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAppCategories, useAppCreateCategory, useAppUpdateCategory, useAppDeleteCategory } from '@/hooks/use-auth-api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit } from 'lucide-react';
import type { Category } from '@workspace/api-client-react';

export default function Categories() {
  const { data: categories } = useAppCategories();
  const { mutateAsync: createC } = useAppCreateCategory();
  const { mutateAsync: updateC } = useAppUpdateCategory();
  const { mutateAsync: deleteC } = useAppDeleteCategory();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [formData, setFormData] = useState({ name: '', nameAr: '', icon: '🥦' });

  const openEdit = (c: Category | 'new') => {
    setEditing(c);
    if (c === 'new') setFormData({ name: '', nameAr: '', icon: '🥦' });
    else setFormData({ name: c.name, nameAr: c.nameAr, icon: c.icon });
  };

  const handleSave = async () => {
    if (editing === 'new') await createC({ data: formData });
    else if (editing) await updateC({ id: editing.id, data: formData });
    
    queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
    setEditing(null);
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Categories</h2>
        <Button onClick={() => openEdit('new')}><Plus className="w-4 h-4 me-2" /> Add Category</Button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Icon</TableHead>
              <TableHead>Name EN</TableHead>
              <TableHead>Name AR</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories?.map(c => (
              <TableRow key={c.id}>
                <TableCell className="text-2xl">{c.icon}</TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.nameAr}</TableCell>
                <TableCell>{c.productCount}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={async () => {
                    await deleteC({ id: c.id });
                    queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
                  }}><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing === 'new' ? 'New Category' : 'Edit Category'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-semibold">Icon Emoji</label><Input value={formData.icon} onChange={e => setFormData({...formData, icon: e.target.value})} /></div>
            <div><label className="text-sm font-semibold">Name EN</label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
            <div><label className="text-sm font-semibold">Name AR</label><Input dir="rtl" value={formData.nameAr} onChange={e => setFormData({...formData, nameAr: e.target.value})} /></div>
            <Button onClick={handleSave} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
