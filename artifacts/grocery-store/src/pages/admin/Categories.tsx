import React, { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAdminTranslation as useTranslation } from '@/lib/portalI18n';
import { Search } from 'lucide-react';
import { useAppCategories, useAppCreateCategory, useAppUpdateCategory, useAppDeleteCategory } from '@/hooks/use-auth-api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit } from 'lucide-react';
import type { Category } from '@workspace/api-client-react';

export default function Categories() {
  const { data: categories, isLoading: categoriesLoading } = useAppCategories();
  const { mutateAsync: createC } = useAppCreateCategory();
  const { mutateAsync: updateC } = useAppUpdateCategory();
  const { mutateAsync: deleteC } = useAppDeleteCategory();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [formData, setFormData] = useState({ name: '', nameAr: '', icon: '🥦' });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !categories) return categories || [];
    return categories.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.nameAr.toLowerCase().includes(q)
    );
  }, [categories, search]);

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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Categories</h2>
        <Button onClick={() => openEdit('new')}><Plus className="w-4 h-4 me-2" /> Add Category</Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('searchCategories')}
          className="ps-9"
        />
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
            {categoriesLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t('adminLoading')}</TableCell>
              </TableRow>
            )}
            {!categoriesLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {search ? t('adminNoMatchCategories') : t('adminEmptyCategories')}
                </TableCell>
              </TableRow>
            )}
            {!categoriesLoading && filtered.map(c => (
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
