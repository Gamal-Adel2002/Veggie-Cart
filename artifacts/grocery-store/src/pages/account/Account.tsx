import React, { useState, useRef, useMemo } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useStore } from '@/store';
import { useAppOrders, useAppUpdateMe, useAppUpdateLocation, useAppUploadImage, useAppCancelOrder, useAppModifyOrder, useAppProducts } from '@/hooks/use-auth-api';
import type { UpdateMeInput } from '@workspace/api-client-react';
import { MapPin, User as UserIcon, Package, PencilSimple, Camera, X, CircleNotch, Warning, PencilLine, Prohibit, Plus, Minus, Trash } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPicker } from '@/components/MapPicker';
import { format } from 'date-fns';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const statusColors: Record<string, string> = {
  waiting: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  accepted: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  preparing: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  with_delivery: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  completed: 'bg-green-500/10 text-green-600 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
  cancelled: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
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

  const [form, setForm] = useState({
    name: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [phoneError, setPhoneError] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [mapLoc, setMapLoc] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapAddress, setMapAddress] = useState<string>('');
  const [locationZoneValid, setLocationZoneValid] = useState(true);

  // Cancel order state
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null);

  // Modify order state
  const [modifyTargetId, setModifyTargetId] = useState<number | null>(null);
  const [editItems, setEditItems] = useState<EditItem[]>([]);
  const [productSearch, setProductSearch] = useState('');

  const startEditing = () => {
    if (!user) return;
    setForm({
      name: user.name,
      phone: user.phone,
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    });
    setPreviewImage(user.profileImage || '');
    setImageFile(null);
    setMapLoc(user.latitude && user.longitude ? { latitude: user.latitude, longitude: user.longitude } : null);
    setMapAddress(user.address || '');
    setLocationZoneValid(true);
    setPhoneError('');
    setEditing(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
      setPreviewImage(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.newPassword && form.newPassword !== form.confirmNewPassword) {
      toast({ title: t('passwordsDoNotMatch'), variant: 'destructive' });
      return;
    }

    if (form.phone && !/^0(10|11|12|15)\d{8}$/.test(form.phone)) {
      setPhoneError(t('invalidEgyptianPhone'));
      return;
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
          data: {
            latitude: mapLoc.latitude,
            longitude: mapLoc.longitude,
            address: mapAddress || undefined,
          }
        });
        setAuth(token, locUpdated);
      }

      toast({ title: t('profileUpdated'), description: t('profileUpdatedDesc') });
      setEditing(false);
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      const isAlreadyInUse = msg?.toLowerCase().includes('already');
      if (isAlreadyInUse) {
        setPhoneError(t('phoneAlreadyExists'));
      } else {
        toast({ title: t('updateFailed'), description: msg, variant: 'destructive' });
      }
    }
  };

  // Cancel order
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

  // Open modify dialog with pre-filled items
  const openModifyDialog = (orderId: number) => {
    const order = orders?.find(o => o.id === orderId);
    if (!order) return;
    setEditItems(order.items.map(item => ({
      productId: item.productId,
      productName: item.productName,
      productNameAr: item.productNameAr,
      unit: item.unit,
      price: item.price,
      quantity: item.quantity,
    })));
    setProductSearch('');
    setModifyTargetId(orderId);
  };

  // Running total for modify dialog
  const runningTotal = useMemo(
    () => editItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [editItems]
  );

  // Filtered products for adding (exclude already in list, filter by search, in-stock only)
  const addableProducts = useMemo(() => {
    if (!products) return [];
    const inList = new Set(editItems.map(i => i.productId));
    return products.filter(p =>
      p.inStock &&
      !inList.has(p.id) &&
      (productSearch === '' ||
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.nameAr.includes(productSearch))
    );
  }, [products, editItems, productSearch]);

  const updateQty = (productId: number, delta: number) => {
    setEditItems(prev => prev.map(item => {
      if (item.productId !== productId) return item;
      const newQty = Math.max(0.5, +(item.quantity + delta).toFixed(2));
      return { ...item, quantity: newQty };
    }));
  };

  const removeItem = (productId: number) => {
    setEditItems(prev => prev.filter(i => i.productId !== productId));
  };

  const addProductToEdit = (productId: number) => {
    const p = products?.find(pr => pr.id === productId);
    if (!p) return;
    setEditItems(prev => [...prev, {
      productId: p.id,
      productName: p.name,
      productNameAr: p.nameAr,
      unit: p.unit,
      price: p.price,
      quantity: 1,
    }]);
    setProductSearch('');
  };

  const handleModifySave = async () => {
    if (!modifyTargetId || editItems.length === 0) return;
    try {
      await modifyOrder({
        id: modifyTargetId,
        data: { items: editItems.map(i => ({ productId: i.productId, quantity: i.quantity })) },
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({ title: t('modifyOrderSuccess'), description: t('modifyOrderSuccessDesc') });
      setModifyTargetId(null);
    } catch (err: unknown) {
      toast({ title: t('modifyOrderFailed'), description: getErrorMessage(err), variant: 'destructive' });
    }
  };

  if (!user) return <div className="p-8">{t('pleaseLogin')}</div>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-12 flex flex-col md:flex-row gap-8">

        {/* Profile Card / Edit Form */}
        <aside className="w-full md:w-80 shrink-0 space-y-4">
          {!editing ? (
            <div className="bg-card border border-border/50 rounded-3xl p-6 text-center shadow-sm">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
                {user.profileImage ? (
                  <img src={user.profileImage} className="w-full h-full object-cover" alt={user.name} />
                ) : (
                  <UserIcon className="w-10 h-10 text-primary" />
                )}
              </div>
              <h2 className="text-2xl font-bold font-display">{user.name}</h2>
              <p className="text-muted-foreground">{user.phone}</p>

              <Button
                variant="outline"
                size="sm"
                className="mt-4 rounded-xl gap-2 border-primary/20 text-primary hover:bg-primary/5"
                onClick={startEditing}
              >
                <PencilSimple className="w-4 h-4" /> {t('editProfile')}
              </Button>

              {(user.latitude && user.longitude) && (
                <div className="mt-6 pt-6 border-t border-border/50 text-left">
                  <h3 className="font-semibold mb-3 flex items-center gap-2 text-foreground">
                    <MapPin className="w-4 h-4 text-primary" /> {t('savedLocation')}
                  </h3>
                  <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-xl">
                    {user.latitude.toFixed(4)}, {user.longitude.toFixed(4)}
                  </p>
                  {user.address && <p className="text-sm mt-2">{user.address}</p>}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSave} className="bg-card border border-border/50 rounded-3xl p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold font-display">{t('editProfile')}</h2>
                <button type="button" onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Profile image */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-muted border-2 border-dashed border-border overflow-hidden flex items-center justify-center">
                    {previewImage ? (
                      <img src={previewImage} className="w-full h-full object-cover" alt="preview" />
                    ) : (
                      <UserIcon className="w-8 h-8 text-muted-foreground opacity-50" />
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-1.5 rounded-full hover:bg-primary/90 shadow-md"
                    title={t('changePhoto')}
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Name & Phone */}
              <div className="space-y-1">
                <Label className="text-xs">{t('name')}</Label>
                <Input
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="h-10 rounded-xl text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('phone')}</Label>
                <Input
                  required
                  value={form.phone}
                  onChange={e => { setPhoneError(''); setForm(f => ({ ...f, phone: e.target.value })); }}
                  className={`h-10 rounded-xl text-sm${phoneError ? ' border-destructive' : ''}`}
                />
                {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
              </div>

              {/* Password section */}
              <div className="border-t border-border/50 pt-4 space-y-3">
                <p className="text-xs text-muted-foreground">{t('leaveBlankNoChange')}</p>
                <div className="space-y-1">
                  <Label className="text-xs">{t('currentPassword')}</Label>
                  <Input
                    type="password"
                    value={form.currentPassword}
                    onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
                    className="h-10 rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t('newPassword')}</Label>
                  <Input
                    type="password"
                    value={form.newPassword}
                    onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                    className="h-10 rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t('confirmNewPassword')}</Label>
                  <Input
                    type="password"
                    value={form.confirmNewPassword}
                    onChange={e => setForm(f => ({ ...f, confirmNewPassword: e.target.value }))}
                    className="h-10 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Location map picker */}
              <div className="border-t border-border/50 pt-4 space-y-2">
                <Label className="text-xs">{t('deliveryLocation')}</Label>
                <MapPicker
                  location={mapLoc}
                  onChange={(lat, lng) => setMapLoc({ latitude: lat, longitude: lng })}
                  onAddressChange={(addr) => setMapAddress(addr)}
                  onZoneValidation={setLocationZoneValid}
                />
                {/* Manual coordinate inputs */}
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t('latLabel')}</Label>
                    <Input
                      type="number"
                      step="0.00001"
                      placeholder="30.04442"
                      value={mapLoc?.latitude ?? ''}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) setMapLoc(prev => ({ latitude: val, longitude: prev?.longitude ?? 0 }));
                      }}
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t('lngLabel')}</Label>
                    <Input
                      type="number"
                      step="0.00001"
                      placeholder="31.23571"
                      value={mapLoc?.longitude ?? ''}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) setMapLoc(prev => ({ latitude: prev?.latitude ?? 0, longitude: val }));
                      }}
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>
                </div>
                {!locationZoneValid && mapLoc && (
                  <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-destructive">
                    <Warning className="w-4 h-4 mt-0.5 shrink-0" />
                    <p className="text-xs font-medium">{t('outsideDeliveryZoneDesc')}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-xl"
                  onClick={() => setEditing(false)}
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="flex-1 rounded-xl shadow-sm shadow-primary/20"
                  disabled={isSaving || isUploading || (!!mapLoc && !locationZoneValid)}
                >
                  {isSaving || isUploading ? <CircleNotch className="w-4 h-4 animate-spin" /> : t('saveChanges')}
                </Button>
              </div>
            </form>
          )}
        </aside>

        {/* Order History */}
        <div className="flex-1">
          <h2 className="text-2xl font-display font-bold mb-6 flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" /> {t('orderHistory')}
          </h2>

          {isLoading ? (
            <p>{t('loadingOrders')}</p>
          ) : !orders || orders.length === 0 ? (
            <div className="bg-card border border-border/50 rounded-3xl p-12 text-center text-muted-foreground">
              {t('noOrdersYet')}
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(order => (
                <div key={order.id} className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-border/50">
                    <div>
                      <p className="font-bold text-lg">{t('order')} #{order.id}</p>
                      <p className="text-sm text-muted-foreground">{format(new Date(order.createdAt), 'MMM dd, yyyy - hh:mm a')}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-bold text-lg">{order.totalPrice.toFixed(2)} EGP</p>
                      <Badge variant="outline" className={`px-3 py-1 text-sm border ${statusColors[order.status] || ''}`}>
                        {t(`status.${order.status}`)}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground mb-3">
                    {order.items.map(item => `${item.quantity}x ${lang === 'ar' ? item.productNameAr : item.productName}`).join(', ')}
                  </div>
                  {order.status === 'waiting' && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 rounded-xl border-primary/20 text-primary hover:bg-primary/5"
                        onClick={() => openModifyDialog(order.id)}
                      >
                        <PencilLine className="w-3.5 h-3.5" />
                        {t('modifyOrder')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/5"
                        onClick={() => setCancelTargetId(order.id)}
                      >
                        <Prohibit className="w-3.5 h-3.5" />
                        {t('cancelOrder')}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </main>

      {/* Cancel confirmation dialog */}
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
            <DialogTitle>{t('modifyOrderTitle')} #{modifyTargetId}</DialogTitle>
          </DialogHeader>

          {/* Current items */}
          <div className="space-y-2 mt-2">
            {editItems.map(item => (
              <div key={item.productId} className="flex items-center gap-3 bg-muted/30 rounded-xl p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {lang === 'ar' ? item.productNameAr : item.productName}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.price.toFixed(2)} EGP / {item.unit}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="w-6 h-6 rounded-full border border-border flex items-center justify-center hover:bg-muted"
                    onClick={() => updateQty(item.productId, -0.5)}
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                  <button
                    className="w-6 h-6 rounded-full border border-border flex items-center justify-center hover:bg-muted"
                    onClick={() => updateQty(item.productId, 0.5)}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-sm font-semibold w-16 text-right">
                  {(item.price * item.quantity).toFixed(2)}
                </span>
                <button
                  className="text-destructive hover:text-destructive/80 ml-1"
                  onClick={() => removeItem(item.productId)}
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            ))}
            {editItems.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">{t('noProductsAvailable')}</p>
            )}
          </div>

          {/* Add product section */}
          <div className="border-t border-border/50 pt-4 mt-2 space-y-2">
            <p className="text-sm font-semibold">{t('addProduct')}</p>
            <Input
              placeholder={t('findProduct')}
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              className="h-9 rounded-xl text-sm"
            />
            {productSearch && (
              <div className="max-h-40 overflow-y-auto space-y-1 rounded-xl border border-border/50 p-1 bg-card">
                {addableProducts.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">{t('noProductsAvailable')}</p>
                ) : (
                  addableProducts.slice(0, 10).map(p => (
                    <button
                      key={p.id}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/50 text-left"
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

          {/* Running total */}
          <div className="flex items-center justify-between bg-primary/5 rounded-xl px-4 py-3 mt-2">
            <span className="font-semibold text-sm">{t('runningTotal')}</span>
            <span className="font-bold text-primary">{runningTotal.toFixed(2)} EGP</span>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setModifyTargetId(null)}>
              {t('cancel')}
            </Button>
            <Button
              className="rounded-xl shadow-sm shadow-primary/20"
              onClick={handleModifySave}
              disabled={isModifying || editItems.length === 0}
            >
              {isModifying ? <CircleNotch className="w-4 h-4 animate-spin" /> : t('modifyOrderSave')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
