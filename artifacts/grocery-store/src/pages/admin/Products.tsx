import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAppProducts, useAppCategories, useAppCreateProduct, useAppUpdateProduct, useAppDeleteProduct, useAppUploadImage } from '@/hooks/use-auth-api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit } from 'lucide-react';
import type { Product } from '@workspace/api-client-react';

const schema = z.object({
  name: z.string().min(1),
  nameAr: z.string().min(1),
  price: z.coerce.number().min(0.01),
  unit: z.enum(['kg', 'piece', 'bundle']),
  categoryId: z.coerce.number(),
  featured: z.boolean().default(false),
  inStock: z.boolean().default(true)
});

export default function Products() {
  const { data: products } = useAppProducts();
  const { data: categories } = useAppCategories();
  const [editing, setEditing] = useState<Product | null | 'new'>(null);
  
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { name:'', nameAr:'', price:1, unit:'kg', categoryId:1, featured:false, inStock:true } });
  const [file, setFile] = useState<File | null>(null);

  const { mutateAsync: createP } = useAppCreateProduct();
  const { mutateAsync: updateP } = useAppUpdateProduct();
  const { mutateAsync: deleteP } = useAppDeleteProduct();
  const { mutateAsync: uploadImg } = useAppUploadImage();
  const queryClient = useQueryClient();

  const openEdit = (p: Product | 'new') => {
    setEditing(p);
    if (p === 'new') form.reset({ name:'', nameAr:'', price:1, unit:'kg', categoryId:categories?.[0]?.id||1, featured:false, inStock:true });
    else {
      const unit = (["kg", "piece", "bundle"] as const).includes(p.unit as "kg" | "piece" | "bundle")
        ? (p.unit as "kg" | "piece" | "bundle")
        : "kg";
      form.reset({ name:p.name, nameAr:p.nameAr, price:p.price, unit, categoryId:p.categoryId||1, featured:p.featured, inStock:p.inStock });
    }
  };

  const onSubmit = async (data: z.infer<typeof schema>) => {
    let imageUrl = typeof editing === 'object' && editing?.image ? editing.image : undefined;
    if (file) {
      const res = await uploadImg({ data: { file } });
      imageUrl = res.url;
    }

    const payload = { ...data, image: imageUrl };
    if (editing === 'new') await createP({ data: payload });
    else await updateP({ id: editing!.id, data: payload });
    
    queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    setEditing(null);
    setFile(null);
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Manage Products</h2>
        <Button onClick={() => openEdit('new')}><Plus className="w-4 h-4 me-2" /> Add Product</Button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Name (EN/AR)</TableHead>
              <TableHead>Price/Unit</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products?.map(p => (
              <TableRow key={p.id}>
                <TableCell><img src={p.image || ''} className="w-10 h-10 object-contain rounded bg-muted" alt="" /></TableCell>
                <TableCell>{p.name} <br/><span className="text-muted-foreground text-xs">{p.nameAr}</span></TableCell>
                <TableCell>{p.price} / {p.unit}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={async () => {
                    await deleteP({ id: p.id });
                    queryClient.invalidateQueries({ queryKey: ['/api/products'] });
                  }}><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing === 'new' ? 'New Product' : 'Edit Product'}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({field}) => <FormItem><FormLabel>Name EN</FormLabel><FormControl><Input {...field}/></FormControl></FormItem>} />
                <FormField control={form.control} name="nameAr" render={({field}) => <FormItem><FormLabel>Name AR</FormLabel><FormControl><Input {...field} dir="rtl"/></FormControl></FormItem>} />
                <FormField control={form.control} name="price" render={({field}) => <FormItem><FormLabel>Price (EGP)</FormLabel><FormControl><Input type="number" step="0.01" {...field}/></FormControl></FormItem>} />
                <FormField control={form.control} name="unit" render={({field}) => (
                  <FormItem><FormLabel>Unit</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="kg">KG</SelectItem><SelectItem value="piece">Piece</SelectItem><SelectItem value="bundle">Bundle</SelectItem></SelectContent>
                  </Select></FormItem>
                )} />
                <FormField control={form.control} name="categoryId" render={({field}) => (
                  <FormItem><FormLabel>Category</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value.toString()}>
                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                    <SelectContent>{categories?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
                  </Select></FormItem>
                )} />
              </div>
              <div>
                <label className="text-sm font-medium leading-none">Image</label>
                <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mt-1.5" />
              </div>
              <Button type="submit" className="w-full">Save</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
