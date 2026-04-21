import React, { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAdminTranslation as useTranslation } from '@/lib/portalI18n';
import { Search, X, ImagePlus } from 'lucide-react';
import { useAppProducts, useAppCategories, useAppCreateProduct, useAppUpdateProduct, useAppDeleteProduct, useAppUploadImage } from '@/hooks/use-auth-api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit, Package } from 'lucide-react';
import type { Product } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';

const schema = z.object({
  name: z.string().min(1),
  nameAr: z.string().min(1),
  price: z.coerce.number().min(0.01),
  unit: z.enum(['kg', 'piece', 'bundle']),
  categoryId: z.coerce.number(),
  featured: z.boolean().default(false),
  inStock: z.boolean().default(true),
  quantity: z.union([z.coerce.number().min(0), z.literal('')]).optional(),
  quantityAlert: z.union([z.coerce.number().min(0), z.literal('')]).optional(),
});

type FormValues = z.infer<typeof schema>;

export default function Products() {
  const { data: products, isLoading: productsLoading } = useAppProducts();
  const { data: categories } = useAppCategories();
  const [search, setSearch] = useState('');
  const { t } = useTranslation();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Product | null | 'new'>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !products) return products || [];
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.nameAr.toLowerCase().includes(q)
    );
  }, [products, search]);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name:'', nameAr:'', price:1, unit:'kg', categoryId:1, featured:false, inStock:true, quantity:'', quantityAlert:'' }
  });

  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  const { mutateAsync: createP } = useAppCreateProduct();
  const { mutateAsync: updateP } = useAppUpdateProduct();
  const { mutateAsync: deleteP } = useAppDeleteProduct();
  const { mutateAsync: uploadImg } = useAppUploadImage();
  const queryClient = useQueryClient();

  const openEdit = (p: Product | 'new') => {
    setEditing(p);
    setNewFiles([]);
    if (p === 'new') {
      setExistingImages([]);
      form.reset({ name:'', nameAr:'', price:1, unit:'kg', categoryId:categories?.[0]?.id||1, featured:false, inStock:true, quantity:'', quantityAlert:'' });
    } else {
      const imgs: string[] = [];
      if (p.image) imgs.push(p.image);
      if (p.images) {
        for (const img of p.images) {
          if (img && !imgs.includes(img)) imgs.push(img);
        }
      }
      setExistingImages(imgs);
      const unit = (["kg", "piece", "bundle"] as const).includes(p.unit as "kg" | "piece" | "bundle")
        ? (p.unit as "kg" | "piece" | "bundle")
        : "kg";
      form.reset({
        name: p.name,
        nameAr: p.nameAr,
        price: p.price,
        unit,
        categoryId: p.categoryId||1,
        featured: p.featured,
        inStock: p.inStock,
        quantity: p.quantity !== null && p.quantity !== undefined ? p.quantity : '',
        quantityAlert: p.quantityAlert !== null && p.quantityAlert !== undefined ? p.quantityAlert : '',
      });
    }
  };

  const onSubmit = async (data: FormValues) => {
    const uploadedUrls: string[] = [];
    for (const f of newFiles) {
      const res = await uploadImg({ data: { file: f } });
      uploadedUrls.push(res.url);
    }

    const allImages = [...existingImages, ...uploadedUrls];
    const primaryImage = allImages[0] ?? undefined;

    const qty = data.quantity !== '' && data.quantity !== undefined ? Number(data.quantity) : null;
    const qtyAlert = data.quantityAlert !== '' && data.quantityAlert !== undefined ? Number(data.quantityAlert) : null;

    const payload = {
      name: data.name,
      nameAr: data.nameAr,
      price: data.price,
      unit: data.unit,
      categoryId: data.categoryId,
      featured: data.featured,
      inStock: qty !== null ? qty > 0 : data.inStock,
      image: primaryImage,
      images: allImages.length > 0 ? allImages : undefined,
      quantity: qty as number | undefined,
      quantityAlert: qtyAlert as number | undefined,
    };

    if (editing === 'new') await createP({ data: payload });
    else await updateP({ id: (editing as Product).id, data: payload });
    
    queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    setEditing(null);
    setNewFiles([]);
    setExistingImages([]);
  };

  const getStockBadge = (p: Product) => {
    if (!p.inStock || (p.quantity !== null && p.quantity !== undefined && p.quantity <= 0)) {
      return <Badge variant="destructive" className="text-xs">{t('adminProductOutOfStock')}</Badge>;
    }
    if (p.quantity !== null && p.quantity !== undefined) {
      return <Badge variant="outline" className="text-xs text-green-600 border-green-300">{p.quantity} {p.unit}</Badge>;
    }
    return <Badge variant="outline" className="text-xs text-green-600 border-green-300">{t('adminProductInStock')}</Badge>;
  };

  const removeExistingImage = (url: string) => {
    setExistingImages(prev => prev.filter(i => i !== url));
  };

  const removeNewFile = (idx: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    const invalid = picked.filter(f => !ALLOWED_IMAGE_TYPES.has(f.type));
    if (invalid.length > 0) {
      toast({ title: t('unsupportedImageType'), variant: 'destructive' });
      e.target.value = '';
      return;
    }
    setNewFiles(prev => [...prev, ...picked]);
    e.target.value = '';
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">{t('adminManageProducts')}</h2>
        <Button onClick={() => openEdit('new')}><Plus className="w-4 h-4 me-2" /> {t('adminAddProduct')}</Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('searchProducts')}
          className="ps-9"
        />
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('adminProductImageCol')}</TableHead>
              <TableHead>{t('adminProductNameCol')}</TableHead>
              <TableHead>{t('adminProductPriceUnitCol')}</TableHead>
              <TableHead>{t('adminProductStockCol')}</TableHead>
              <TableHead>{t('adminActionsCol')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productsLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t('adminLoading')}</TableCell>
              </TableRow>
            )}
            {!productsLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {search ? t('adminNoMatchProducts') : t('adminEmptyProducts')}
                </TableCell>
              </TableRow>
            )}
            {!productsLoading && filtered.map(p => {
              const imgCount = (p.images?.length ?? 0) + (p.image && !p.images?.includes(p.image) ? 1 : 0);
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="relative inline-block">
                      <img src={p.image || ''} className="w-10 h-10 object-contain rounded bg-muted" alt="" />
                      {imgCount > 1 && (
                        <span className="absolute -top-1 -end-1 bg-primary text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                          {imgCount}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{p.name} <br/><span className="text-muted-foreground text-xs">{p.nameAr}</span></TableCell>
                  <TableCell>{p.price} / {p.unit}</TableCell>
                  <TableCell>{getStockBadge(p)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={async () => {
                      await deleteP({ id: p.id });
                      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
                    }}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? t('adminProductNewTitle') : t('adminProductEditTitle')}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({field}) => (
                  <FormItem><FormLabel>{t('adminProductNameEnLabel')}</FormLabel><FormControl><Input {...field}/></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="nameAr" render={({field}) => (
                  <FormItem><FormLabel>{t('adminProductNameArLabel')}</FormLabel><FormControl><Input {...field} dir="rtl"/></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="price" render={({field}) => (
                  <FormItem><FormLabel>{t('adminProductPriceLabel')}</FormLabel><FormControl><Input type="number" step="0.01" {...field}/></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="unit" render={({field}) => (
                  <FormItem><FormLabel>{t('adminProductUnitLabel')}</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="kg">{t('adminProductUnitKg')}</SelectItem>
                      <SelectItem value="piece">{t('adminProductUnitPiece')}</SelectItem>
                      <SelectItem value="bundle">{t('adminProductUnitBundle')}</SelectItem>
                    </SelectContent>
                  </Select></FormItem>
                )} />
                <FormField control={form.control} name="categoryId" render={({field}) => (
                  <FormItem><FormLabel>{t('adminProductCategoryLabel')}</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value.toString()}>
                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                    <SelectContent>{categories?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
                  </Select></FormItem>
                )} />
              </div>

              <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1">
                  <Package className="w-4 h-4 text-primary" />
                  {t('adminProductStockSection')}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="quantity" render={({field}) => (
                    <FormItem>
                      <FormLabel>{t('adminProductQtyLabel')(form.watch('unit') || 'unit')}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" min="0" placeholder={t('adminProductQtyPlaceholder')} {...field} value={field.value ?? ''} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="quantityAlert" render={({field}) => (
                    <FormItem>
                      <FormLabel>{t('adminProductAlertLabel')}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" min="0" placeholder={t('adminProductAlertPlaceholder')} {...field} value={field.value ?? ''} />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
                <p className="text-xs text-muted-foreground">{t('adminProductStockDesc')}</p>
              </div>

              {/* Multi-image section */}
              <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ImagePlus className="w-4 h-4 text-primary" />
                  Product Images
                  <span className="text-xs text-muted-foreground font-normal ml-1">
                    ({existingImages.length + newFiles.length} total — first image is primary)
                  </span>
                </div>

                {/* Existing images */}
                {(existingImages.length > 0 || newFiles.length > 0) && (
                  <div className="flex flex-wrap gap-2">
                    {existingImages.map((url, i) => (
                      <div key={url} className="relative group">
                        <img src={url} className="w-16 h-16 object-cover rounded-lg border border-border" alt="" />
                        {i === 0 && (
                          <span className="absolute top-0.5 start-0.5 bg-primary text-white text-[9px] font-bold px-1 rounded">
                            1st
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeExistingImage(url)}
                          className="absolute -top-1.5 -end-1.5 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {newFiles.map((f, i) => (
                      <div key={i} className="relative group">
                        <img src={URL.createObjectURL(f)} className="w-16 h-16 object-cover rounded-lg border-2 border-dashed border-primary/50" alt="" />
                        <span className="absolute top-0.5 start-0.5 bg-blue-500 text-white text-[9px] font-bold px-1 rounded">
                          new
                        </span>
                        <button
                          type="button"
                          onClick={() => removeNewFile(i)}
                          className="absolute -top-1.5 -end-1.5 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all text-sm text-muted-foreground">
                  <ImagePlus className="w-4 h-4" />
                  Add images
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.gif"
                    multiple
                    onChange={handleFileAdd}
                    className="hidden"
                  />
                </label>
              </div>

              <Button type="submit" className="w-full">{t('adminSave')}</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
