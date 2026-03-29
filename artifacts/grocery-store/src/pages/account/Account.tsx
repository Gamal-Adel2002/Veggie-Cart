import React, { useState, useRef } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useStore } from '@/store';
import { useAppOrders, useAppUpdateMe, useAppUpdateLocation, useAppUploadImage } from '@/hooks/use-auth-api';
import { MapPin, User as UserIcon, Package, Edit2, Camera, X, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPicker } from '@/components/MapPicker';
import { format } from 'date-fns';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';

const statusColors: Record<string, string> = {
  waiting: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  accepted: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  preparing: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  with_delivery: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  completed: 'bg-green-500/10 text-green-600 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export default function Account() {
  const { t, lang } = useTranslation();
  const user = useStore(s => s.user);
  const setAuth = useStore(s => s.setAuth);
  const token = useStore(s => s.token);
  const { data: orders, isLoading } = useAppOrders();
  const { mutateAsync: updateMe, isPending: isSaving } = useAppUpdateMe();
  const { mutateAsync: updateLocation } = useAppUpdateLocation();
  const { mutateAsync: uploadImage, isPending: isUploading } = useAppUploadImage();
  const { toast } = useToast();

  const [editing, setEditing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [previewImage, setPreviewImage] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [mapLoc, setMapLoc] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapAddress, setMapAddress] = useState<string>('');

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

    try {
      let imageUrl = user?.profileImage || '';
      if (imageFile) {
        const res = await uploadImage({ data: { file: imageFile } });
        imageUrl = res.url;
      }

      const payload: Record<string, string | undefined> = {
        name: form.name,
        phone: form.phone,
        profileImage: imageUrl || undefined,
      };
      if (form.newPassword) {
        payload.currentPassword = form.currentPassword;
        payload.newPassword = form.newPassword;
      }

      const updated = await updateMe({ data: payload });
      // Update store immediately after profile save so UI reflects changes
      setAuth(token, updated);

      // Update location separately if coordinates changed
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
      toast({ title: t('updateFailed'), description: getErrorMessage(err), variant: 'destructive' });
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
                <Edit2 className="w-4 h-4" /> {t('editProfile')}
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
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="h-10 rounded-xl text-sm"
                />
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
                />
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
                  disabled={isSaving || isUploading}
                >
                  {isSaving || isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('saveChanges')}
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
                      <Badge variant="outline" className={`px-3 py-1 text-sm border ${statusColors[order.status]}`}>
                        {t(`status.${order.status}`)}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {order.items.map(item => `${item.quantity}x ${lang === 'ar' ? item.productNameAr : item.productName}`).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
