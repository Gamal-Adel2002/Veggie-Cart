import React, { useState, useRef, useMemo } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useStore } from '@/store';
import { useAppOrders, useAppUpdateMe, useAppUpdateLocation, useAppUploadImage, useAppCancelOrder, useAppModifyOrder, useAppProducts } from '@/hooks/use-auth-api';
import type { UpdateMeInput } from '@workspace/api-client-react';
import { MapPin, User as UserIcon, Package, PencilSimple, Camera, X, CircleNotch, Warning, PencilLine, Prohibit, Plus, Minus, Trash } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPicker } from '@/components/MapPicker';
import { format } from 'date-fns';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const statusColors: Record<string, string> = {
  waiting:       'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
  accepted:      'bg-blue-500/10 text-blue-700 border-blue-500/20',
  preparing:     'bg-orange-500/10 text-orange-700 border-orange-500/20',
  with_delivery: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  completed:     'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  rejected:      'bg-red-500/10 text-red-700 border-red-500/20',
  cancelled:     'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

interface EditItem {
  productId: number;
  productName: string;
  productNameAr: string;
  unit: string;
  price: number;
  quantity: number;
}

export default function Account() {
  const { t, lang } = useTranslation();
  const user = useStore(s => s.user);
  const setAuth = useStore(s => s.setAuth);
  const token = useStore(s => s.token);
  const { data: orders, isLoading } = useAppOrders();
  const { mutateAsync: updateMe, isPending: isSaving } = useAppUpdateMe();
  const { mutateAsync: updateLocation } = useAppUpdateLocation();
  const { mutateAsync: uploadImage, isPending: isUploading } = useAppUploadImage();
  const { mutateAsync: cancelOrder, isPending: isCancelling } = useAppCancelOrder();
  const { mutateAsync: modifyOrder, isPending: isModifying } = useAppModifyOrder();
  const { data: products } = useAppProducts();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ name: '', phone: '', currentPassword: '', newPassword: '', confirmNewPassword: '' });
  const [phoneError, setPhoneError] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [mapLoc, setMapLoc] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapAddress, setMapAddress] = useState<string>('');
  const [locationZoneValid, setLocationZoneValid] = useState(true);
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null);
  const [modifyTargetId, setModifyTargetId] = useState<number | null>(null);
  const [editItems, setEditItems] = useState<EditItem[]>([]);
  const [productSearch, setProductSearch] = useState('');

  const startEditing = () => {
    if (!user) return;
    setForm({ name: user.name, phone: user.phone, currentPassword: '', newPassword: '', confirmNewPassword: '' });
    setPreviewImage(user.profileImage || '');
    setImageFile(null);
    setMapLoc(user.latitude && user.longitude ? { latitude: user.latitude, longitude: user.longitude } : null);
    setMapAddress(user.address || '');
    setLocationZoneValid(true);
    setPhoneError('');
    setEditing(true);
  };

  const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      toast({ title: t('unsupportedImageType'), variant: 'destructive' });
      e.target.value = '';
      return;
    }
    setImageFile(file);
    setPreviewImage(URL.createObjectURL(file));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword && form.newPassword !== form.confirmNewPassword) {
      toast({ title: t('passwordsDoNotMatch'), variant: 'destructive' }); return;
    }
    if (form.phone && !/^0(10|11|12|15)\d{8}$/.test(form.phone)) {
      setPhoneError(t('invalidEgyptianPhone')); return;
    }
    setPhoneError('');

    try {
      let imageUrl = user?.profileImage || '';
      if (imageFile) {
        const res = await uploadImage({ data: { file: imageFile } });
        imageUrl = res.url;
      }

      const payload: UpdateMeInput = {
        name: form.name || undefined,
        phone: form.phone || undefined,
        profileImage: imageUrl || undefined,
      };
      if (form.newPassword) {
        payload.currentPassword = form.currentPassword || undefined;
        payload.newPassword = form.newPassword;
      }

      const updated = await updateMe({ data: payload });
      setAuth(token, updated);

      if (mapLoc && (mapLoc.latitude !== user?.latitude || mapLoc.longitude !== user?.longitude)) {
        const locUpdated = await updateLocation({
          data: { latitude: mapLoc.latitude, longitude: mapLoc.longitude, address: mapAddress || undefined }
        });
        setAuth(token, locUpdated);
      }

      toast({ title: t('profileUpdated'), description: t('profileUpdatedDesc') });
      setEditing(false);
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      if (msg?.toLowerCase().includes('already')) {
        setPhoneError(t('phoneAlreadyExists'));
      } else {
        toast({ title: t('updateFailed'), description: msg, variant: 'destructive' });
      }
    }
  };

  const handleCancelConfirm = async () => {
    if (!cancelTargetId) return;
    try {
      await cancelOrder({ id: cancelTargetId });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({ title: t('cancelOrderSuccess'), description: t('cancelOrderSuccessDesc') });
    } catch (err: unknown) {
      toast({ title: t('cancelOrderFailed'), description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setCancelTargetId(null);
    }
  };

  const openModifyDialog = (orderId: number) => {
    const order = orders?.find(o => o.id === orderId);
    if (!order) return;
    setEditItems(order.items.map(item => ({
      productId: item.productId, productName: item.productName, productNameAr: item.productNameAr,
      unit: item.unit, price: item.price, quantity: item.quantity,
    })));
    setProductSearch('');
    setModifyTargetId(orderId);
  };

  const runningTotal = useMemo(() => editItems.reduce((sum, item) => sum + item.price * item.quantity, 0), [editItems]);

  const addableProducts = useMemo(() => {
    if (!products) return [];
    const inList = new Set(editItems.map(i => i.productId));
    return products.filter(p =>
      p.inStock && !inList.has(p.id) &&
      (productSearch === '' || p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.nameAr.includes(productSearch))
    );
  }, [products, editItems, productSearch]);

  const updateQty = (productId: number, delta: number) => {
    setEditItems(prev => prev.map(item => {
      if (item.productId !== productId) return item;
      return { ...item, quantity: Math.max(0.5, +(item.quantity + delta).toFixed(2)) };
    }));
  };

  const removeItem = (productId: number) => setEditItems(prev => prev.filter(i => i.productId !== productId));

  const addProductToEdit = (productId: number) => {
    const p = products?.find(pr => pr.id === productId);
    if (!p) return;
    setEditItems(prev => [...prev, {
      productId: p.id, productName: p.name, productNameAr: p.nameAr,
      unit: p.unit, price: p.price, quantity: 1,
    }]);
    setProductSearch('');
  };

  const handleModifySave = async () => {
    if (!modifyTargetId || editItems.length === 0) return;
    try {
      await modifyOrder({ id: modifyTargetId, data: { items: editItems.map(i => ({ productId: i.productId, quantity: i.quantity })) } });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({ title: t('modifyOrderSuccess'), description: t('modifyOrderSuccessDesc') });
      setModifyTargetId(null);
    } catch (err: unknown) {
      toast({ title: t('modifyOrderFailed'), description: getErrorMessage(err), variant: 'destructive' });
    }
  };

  if (!user) return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">{t('pleaseLogin')}</div>
    </div>
  );

  const inputClass = "h-10 rounded-lg border-border/60 focus-visible:ring-primary/30 bg-background text-sm";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-10 flex flex-col md:flex-row gap-8">

        {/* Profile sidebar */}
        <aside className="w-full md:w-[304px] shrink-0 space-y-4">
          {!editing ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="bg-card border border-border/40 rounded-xl p-6 text-center shadow-sm"
            >
              <div className="w-20 h-20 bg-primary/8 border-2 border-primary/15 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
                {user.profileImage
                  ? <img src={user.profileImage} className="w-full h-full object-cover" alt={user.name} />
                  : <UserIcon className="w-9 h-9 text-primary" />
                }
              </div>
              <h2
                className="text-xl font-bold mb-0.5"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                {user.name}
              </h2>
              <p className="text-muted-foreground text-sm">{user.phone}</p>

              <button
                onClick={startEditing}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg border border-border/60 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all mx-auto"
              >
                <PencilSimple className="w-3.5 h-3.5 text-primary" /> {t('editProfile')}
              </button>

              {user.latitude && user.longitude && (
                <div className="mt-5 pt-5 border-t border-border/40 text-left">
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" /> {t('savedLocation')}
                  </h3>
                  <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg">
                    {user.latitude.toFixed(4)}, {user.longitude.toFixed(4)}
                  </p>
                  {user.address && <p className="text-xs mt-2 text-muted-foreground">{user.address}</p>}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.form
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              onSubmit={handleSave}
              className="bg-card border border-border/40 rounded-xl p-6 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-bold text-base">{t('editProfile')}</h2>
                <button type="button" onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-muted border-2 border-dashed border-border overflow-hidden flex items-center justify-center">
                    {previewImage
                      ? <img src={previewImage} className="w-full h-full object-cover" alt="preview" />
                      : <UserIcon className="w-7 h-7 text-muted-foreground/50" />
                    }
                  </div>
                  <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,.gif" className="hidden" onChange={handleFileChange} />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-md hover:bg-primary/90"
                  >
                    <Camera className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">{t('name')}</Label>
                <Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('phone')}</Label>
                <Input
                  required value={form.phone}
                  onChange={e => { setPhoneError(''); setForm(f => ({ ...f, phone: e.target.value })); }}
                  className={`${inputClass}${phoneError ? ' border-destructive' : ''}`}
                />
                {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
              </div>

              <div className="border-t border-border/40 pt-4 space-y-2.5">
                <p className="text-xs text-muted-foreground">{t('leaveBlankNoChange')}</p>
                <div className="space-y-1">
                  <Label className="text-xs">{t('currentPassword')}</Label>
                  <Input type="password" value={form.currentPassword} onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t('newPassword')}</Label>
                  <Input type="password" value={form.newPassword} onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t('confirmNewPassword')}</Label>
                  <Input type="password" value={form.confirmNewPassword} onChange={e => setForm(f => ({ ...f, confirmNewPassword: e.target.value }))} className={inputClass} />
                </div>
              </div>

              <div className="border-t border-border/40 pt-4 space-y-2">
                <Label className="text-xs">{t('deliveryLocation')}</Label>
                <MapPicker
                  location={mapLoc}
                  onChange={(lat, lng) => setMapLoc({ latitude: lat, longitude: lng })}
                  onAddressChange={(addr) => setMapAddress(addr)}
                  onZoneValidation={setLocationZoneValid}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t('latLabel')}</Label>
                    <Input type="number" step="0.00001" placeholder="30.04442" value={mapLoc?.latitude ?? ''}
                      onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) setMapLoc(prev => ({ latitude: v, longitude: prev?.longitude ?? 0 })); }}
                      className="h-8 text-xs rounded-lg border-border/60 focus-visible:ring-primary/30 bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t('lngLabel')}</Label>
                    <Input type="number" step="0.00001" placeholder="31.23571" value={mapLoc?.longitude ?? ''}
                      onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) setMapLoc(prev => ({ latitude: prev?.latitude ?? 0, longitude: v })); }}
                      className="h-8 text-xs rounded-lg border-border/60 focus-visible:ring-primary/30 bg-background"
                    />
                  </div>
                </div>
                {!locationZoneValid && mapLoc && (
                  <div className="flex items-start gap-2 bg-destructive/5 border border-destructive/20 rounded-lg p-3 text-destructive">
                    <Warning className="w-4 h-4 mt-0.5 shrink-0" />
                    <p className="text-xs">{t('outsideDeliveryZoneDesc')}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 h-9 rounded-lg border border-border/60 text-sm font-medium text-muted-foreground hover:border-border hover:text-foreground transition-all"
                >
                  {t('cancel')}
                </button>
                <motion.button
                  type="submit"
                  disabled={isSaving || isUploading || (!!mapLoc && !locationZoneValid)}
                  whileHover={!isSaving && !isUploading ? { scale: 1.02 } : {}}
                  whileTap={!isSaving && !isUploading ? { scale: 0.97 } : {}}
                  className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {isSaving || isUploading ? <CircleNotch className="w-4 h-4 animate-spin mx-auto" /> : t('saveChanges')}
                </motion.button>
              </div>
            </motion.form>
          )}
        </aside>

        {/* Orders */}
        <div className="flex-1">
          <div className="mb-6">
            <p className="text-accent font-semibold text-xs uppercase tracking-[0.18em] mb-1.5">{t('account')}</p>
            <h2
              className="text-2xl font-bold flex items-center gap-2.5"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              <Package className="w-6 h-6 text-primary" /> {t('orderHistory')}
            </h2>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <CircleNotch className="w-7 h-7 animate-spin text-primary" />
            </div>
          ) : !orders || orders.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
              <div className="text-5xl mb-3 opacity-30">📦</div>
              <p className="font-semibold text-foreground">{t('noOrdersYet')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order, i) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="bg-card border border-border/40 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-border/40">
                    <div>
                      <p className="font-bold">#{order.id.toString().padStart(6, '0')}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(order.createdAt), 'MMM dd, yyyy — hh:mm a')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-lg text-primary">{(order.finalPrice ?? order.totalPrice).toFixed(2)} EGP</p>
                      <Badge variant="outline" className={`px-3 py-0.5 text-xs border ${statusColors[order.status] || ''}`}>
                        {t(`status.${order.status}`)}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
                    {order.items.map(item => `${item.quantity}× ${lang === 'ar' ? item.productNameAr : item.productName}`).join(', ')}
                  </p>
                  {order.status === 'waiting' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openModifyDialog(order.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/20 text-primary text-xs font-medium hover:bg-primary/5 transition-colors"
                      >
                        <PencilLine className="w-3.5 h-3.5" /> {t('modifyOrder')}
                      </button>
                      <button
                        onClick={() => setCancelTargetId(order.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/20 text-destructive text-xs font-medium hover:bg-destructive/5 transition-colors"
                      >
                        <Prohibit className="w-3.5 h-3.5" /> {t('cancelOrder')}
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Cancel confirmation */}
      <AlertDialog open={cancelTargetId !== null} onOpenChange={open => { if (!open) setCancelTargetId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('cancelOrder')}</AlertDialogTitle>
            <AlertDialogDescription>{t('cancelOrderConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleCancelConfirm}
              disabled={isCancelling}
            >
              {isCancelling ? <CircleNotch className="w-4 h-4 animate-spin" /> : t('cancelOrder')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modify order dialog */}
      <Dialog open={modifyTargetId !== null} onOpenChange={open => { if (!open) setModifyTargetId(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('modifyOrderTitle')} #{modifyTargetId?.toString().padStart(6, '0')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-2 mt-2">
            {editItems.map(item => (
              <div key={item.productId} className="flex items-center gap-3 bg-muted/30 rounded-lg p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{lang === 'ar' ? item.productNameAr : item.productName}</p>
                  <p className="text-xs text-muted-foreground">{item.price.toFixed(2)} EGP / {item.unit}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button className="w-6 h-6 rounded-full border border-border flex items-center justify-center hover:bg-muted" onClick={() => updateQty(item.productId, -0.5)}>
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                  <button className="w-6 h-6 rounded-full border border-border flex items-center justify-center hover:bg-muted" onClick={() => updateQty(item.productId, 0.5)}>
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-sm font-semibold w-16 text-right">{(item.price * item.quantity).toFixed(2)}</span>
                <button className="text-destructive hover:text-destructive/80" onClick={() => removeItem(item.productId)}>
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            ))}
            {editItems.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">{t('noProductsAvailable')}</p>
            )}
          </div>

          <div className="border-t border-border/40 pt-4 mt-2 space-y-2">
            <p className="text-sm font-semibold">{t('addProduct')}</p>
            <Input
              placeholder={t('findProduct')}
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              className="h-9 rounded-lg text-sm border-border/60 focus-visible:ring-primary/30 bg-background"
            />
            {productSearch && (
              <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-border/40 p-1 bg-card">
                {addableProducts.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">{t('noProductsAvailable')}</p>
                ) : (
                  addableProducts.slice(0, 10).map(p => (
                    <button
                      key={p.id}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/50 text-left"
                      onClick={() => addProductToEdit(p.id)}
                    >
                      <span className="text-sm">{lang === 'ar' ? p.nameAr : p.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{p.price.toFixed(2)} EGP/{p.unit}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between bg-primary/5 border border-primary/10 rounded-lg px-4 py-3 mt-2">
            <span className="font-semibold text-sm">{t('runningTotal')}</span>
            <span className="font-bold text-primary">{runningTotal.toFixed(2)} EGP</span>
          </div>

          <DialogFooter className="mt-2">
            <button
              className="px-4 py-2 rounded-lg border border-border/60 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setModifyTargetId(null)}
            >
              {t('cancel')}
            </button>
            <motion.button
              onClick={handleModifySave}
              disabled={isModifying || editItems.length === 0}
              whileHover={!isModifying && editItems.length > 0 ? { scale: 1.02 } : {}}
              whileTap={!isModifying && editItems.length > 0 ? { scale: 0.97 } : {}}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {isModifying ? <CircleNotch className="w-4 h-4 animate-spin" /> : t('modifyOrderSave')}
            </motion.button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
