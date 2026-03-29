import React, { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useStore } from '@/store';
import { useTranslation } from '@/lib/i18n';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MapPicker } from '@/components/MapPicker';
import { useAppCreateOrder } from '@/hooks/use-auth-api';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';
import type { CartItem } from '@/store';

export default function Checkout() {
  const { t, lang } = useTranslation();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  const user = useStore(s => s.user);
  const cart = useStore(s => s.cart);
  const total = useStore(s => s.getCartTotal());
  const clearCart = useStore(s => s.clearCart);

  const { mutateAsync: createOrder, isPending } = useAppCreateOrder();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    notes: ''
  });

  const hasSavedLoc = user && user.latitude && user.longitude;
  const [useSaved, setUseSaved] = useState(!!hasSavedLoc);
  const [mapLoc, setMapLoc] = useState<{latitude: number, longitude: number} | null>(null);
  const [zoneValid, setZoneValid] = useState(true);

  if (cart.length === 0) {
    setLocation('/cart');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!useSaved && !mapLoc) {
      toast({ title: t('selectLocationError'), variant: "destructive" });
      return;
    }
    if (!zoneValid) {
      toast({ title: t('outsideDeliveryZone'), variant: "destructive" });
      return;
    }

    try {
      const order = await createOrder({
        data: {
          customerName: formData.name,
          customerPhone: formData.phone,
          notes: formData.notes,
          latitude: useSaved ? user!.latitude! : mapLoc!.latitude,
          longitude: useSaved ? user!.longitude! : mapLoc!.longitude,
          items: cart.map(item => ({ productId: item.id, quantity: item.cartQuantity }))
        }
      });
      clearCart();
      setLocation(`/order-confirmed/${order.id}`);
    } catch (err: unknown) {
      toast({ title: t('orderPlacedError'), description: getErrorMessage(err), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-12 flex flex-col lg:flex-row gap-10">
        <div className="flex-1">
          <h1 className="text-3xl font-display font-bold mb-8">{t('checkoutTitle')}</h1>

          <form id="checkout-form" onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-card border border-border/50 p-6 rounded-3xl shadow-sm">
              <h2 className="text-xl font-bold mb-4">{t('contactInfo')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('fullName')}</Label>
                  <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>{t('phoneNumber')}</Label>
                  <Input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="h-12 rounded-xl" />
                </div>
              </div>
            </div>

            <div className="bg-card border border-border/50 p-6 rounded-3xl shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">{t('deliveryLocation')}</h2>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1 px-3 py-1 text-sm"><Clock className="w-3 h-3" /> {t('deliveryTime')}</Badge>
              </div>

              {hasSavedLoc && (
                <div className="flex gap-4">
                  <Button type="button" variant={useSaved ? "default" : "outline"} className="rounded-xl flex-1 h-12" onClick={() => setUseSaved(true)}>
                    {t('useSavedLocation')}
                  </Button>
                  <Button type="button" variant={!useSaved ? "default" : "outline"} className="rounded-xl flex-1 h-12" onClick={() => setUseSaved(false)}>
                    {t('chooseNewLocation')}
                  </Button>
                </div>
              )}

              {useSaved && hasSavedLoc ? (
                <div className="bg-muted/30 border border-border/50 rounded-xl p-4 flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">{t('savedAddress')}</p>
                    <p className="text-sm text-muted-foreground">{user?.address || t('locationPinned')}</p>
                  </div>
                </div>
              ) : (
                <>
                  <MapPicker
                    location={mapLoc}
                    onChange={(lat, lng) => setMapLoc({latitude: lat, longitude: lng})}
                    onZoneValidation={setZoneValid}
                  />
                  {!zoneValid && mapLoc && (
                    <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-destructive">
                      <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                      <p className="text-sm font-medium">{t('outsideDeliveryZoneDesc')}</p>
                    </div>
                  )}
                </>
              )}

              <div className="space-y-2">
                <Label>{t('deliveryNotes')}</Label>
                <Textarea
                  placeholder={t('deliveryNotesPlaceholder')}
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="rounded-xl resize-none"
                />
              </div>
            </div>
          </form>
        </div>

        <div className="w-full lg:w-96 shrink-0">
          <div className="bg-card border border-border/50 rounded-3xl p-6 sticky top-24 shadow-lg shadow-black/5">
            <h3 className="font-bold text-xl mb-6">{t('orderSummary')}</h3>
            <div className="space-y-4 mb-6">
              {cart.map((item: CartItem) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground truncate pe-4">{item.cartQuantity}x {lang === 'ar' ? item.nameAr : item.name}</span>
                  <span className="font-medium shrink-0">{(item.price * item.cartQuantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border/50 pt-4 mb-8">
              <div className="flex justify-between text-2xl font-bold">
                <span>{t('total')}</span>
                <span className="text-primary">{total.toFixed(2)} <span className="text-sm text-muted-foreground">EGP</span></span>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 p-4 rounded-xl flex items-center gap-3 mb-6 border border-green-200 dark:border-green-900">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium">{t('paymentCash')}</span>
            </div>

            <Button
              type="submit"
              form="checkout-form"
              disabled={isPending || (!useSaved && !!mapLoc && !zoneValid)}
              size="lg"
              className="w-full rounded-xl h-14 text-lg font-bold shadow-lg shadow-primary/20"
            >
              {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : t('confirmOrder')}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
