import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useStore } from '@/store';
import { useTranslation } from '@/lib/i18n';
import { useLocation, Link } from 'wouter';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MapPicker } from '@/components/MapPicker';
import { useAppCreateOrder } from '@/hooks/use-auth-api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, MapPin, CheckCircle, CircleNotch, Warning, Tag, Sparkle, Ticket, Trash } from '@phosphor-icons/react';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { CartItem } from '@/store';
import { motion } from 'framer-motion';
import { useStoreStatus } from '@/hooks/use-store-status';
import type { CreateOrderInput } from '@workspace/api-client-react';

interface DeliveryZone {
  id: number;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  active: boolean;
}

interface DeliveryFeeSettings {
  feeType: "fixed" | "percentage";
  feeValue: number;
  minimumFee: number;
}

interface Voucher {
  id: number;
  amount: number;
  validUntil: string;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function Checkout() {
  const { t, lang } = useTranslation();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  const user = useStore(s => s.user);
  const cart = useStore(s => s.cart);
  const total = useStore(s => s.getCartTotal());
  const clearCart = useStore(s => s.clearCart);

  const { data: storeStatus, isLoading: storeStatusLoading } = useStoreStatus();
  const { mutateAsync: createOrder, isPending } = useAppCreateOrder();
  const queryClient = useQueryClient();

  const { data: zones = [] } = useQuery<DeliveryZone[]>({
    queryKey: ['delivery-zones'],
    queryFn: async () => {
      const res = await fetch('/api/delivery-zones');
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: deliverySettings } = useQuery<DeliveryFeeSettings>({
    queryKey: ['delivery-settings'],
    queryFn: async () => {
      const res = await fetch('/api/delivery-fee');
      if (!res.ok) throw new Error('Failed to fetch delivery fee');
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
  });

  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState<{ valid: boolean; discountType?: string; discountValue?: number; message?: string } | null>(null);
  const [promoValidating, setPromoValidating] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [discountDisplay, setDiscountDisplay] = useState<{ amount: number; label: string } | null>(null);

  const { data: myVouchers = [] } = useQuery<Voucher[]>({
    queryKey: ['my-vouchers'],
    queryFn: async () => {
      const res = await fetch('/api/vouchers/my', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
  });

  const [formData, setFormData] = useState({ name: '', phone: '', notes: '' });
  const [paymentMethod] = useState<'cash'>('cash');
  const [isProcessingPayment] = useState(false);

  const hasSavedLoc = user && user.latitude && user.longitude;
  const [useSaved, setUseSaved] = useState(!!hasSavedLoc);
  const [mapLoc, setMapLoc] = useState<{latitude: number, longitude: number} | null>(null);
  const [mapZoneValid, setMapZoneValid] = useState(true);
  const [savedZoneValid, setSavedZoneValid] = useState(true);

  useEffect(() => {
    if (user) {
      setFormData({ name: user.name || '', phone: user.phone || '', notes: '' });
    }
  }, [user]);

  useEffect(() => {
    if (!hasSavedLoc || zones.length === 0) { setSavedZoneValid(true); return; }
    const inZone = zones.some(z => haversineKm(user!.latitude!, user!.longitude!, z.centerLat, z.centerLng) <= z.radiusKm);
    setSavedZoneValid(inZone);
  }, [zones, hasSavedLoc, user]);

  const applyPromo = async () => {
    if (!promoCode.trim()) return;
    setSelectedVoucher(null);
    setPromoValidating(true);
    try {
      const res = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode.trim() }),
      });
      const data = await res.json();
      setPromoResult(data);
      if (data.valid) {
        let amt = data.discountType === 'percentage' ? total * (data.discountValue / 100) : data.discountValue;
        amt = Math.min(amt, total);
        setDiscountDisplay({ amount: Math.round(amt * 100) / 100, label: promoCode.trim().toUpperCase() });
      } else {
        setDiscountDisplay(null);
      }
    } catch (e: unknown) {
      setPromoResult({ valid: false, message: getErrorMessage(e) });
      setDiscountDisplay(null);
    } finally {
      setPromoValidating(false);
    }
  };

  const selectVoucher = (voucher: Voucher) => {
    setPromoResult(null);
    setPromoCode('');
    setSelectedVoucher(voucher);
    const raw = Number(voucher.amount);
    const safeAmt = Number.isFinite(raw) && raw > 0 ? raw : 0;
    const amt = Math.min(safeAmt, total);
    setTimeout(() => {
      setDiscountDisplay({ amount: Math.round(amt * 100) / 100, label: String(t('voucherLabel')) });
    }, 0);
  };

  const clearDiscount = () => {
    setPromoCode(''); setPromoResult(null); setSelectedVoucher(null); setDiscountDisplay(null);
  };

  const zoneValid = useSaved ? savedZoneValid : mapZoneValid;

  let deliveryFee = 0;
  if (deliverySettings) {
    deliveryFee = deliverySettings.feeType === 'percentage'
      ? total * (deliverySettings.feeValue / 100)
      : deliverySettings.feeValue;
    if (deliverySettings.minimumFee > 0) deliveryFee = Math.max(deliveryFee, deliverySettings.minimumFee);
    deliveryFee = Math.round(deliveryFee * 100) / 100;
  }

  const discountedTotal = discountDisplay ? total - discountDisplay.amount : total;
  const displayTotal = discountedTotal + deliveryFee;

  if (!user) { setLocation('/auth/login'); return null; }

  if (!storeStatusLoading && storeStatus && !storeStatus.open) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border/40 rounded-xl p-12 text-center max-w-md shadow-md"
          >
            <div className="text-5xl mb-5">🌙</div>
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>{t('storeClosedTitle')}</h2>
            <p className="text-muted-foreground text-sm mb-7">{t('storeClosedDesc')}</p>
            <Link href="/cart">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="px-7 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-sm"
              >
                {t('backToCart')}
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  if (storeStatusLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background items-center justify-center">
        <CircleNotch className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (cart.length === 0) { setLocation('/cart'); return null; }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!useSaved && !mapLoc) { toast({ title: t('selectLocationError'), variant: "destructive" }); return; }
    if (!zoneValid) { toast({ title: t('outsideDeliveryZone'), variant: "destructive" }); return; }

    try {
      const orderPayload: CreateOrderInput = {
        customerName: formData.name,
        customerPhone: formData.phone,
        notes: formData.notes,
        latitude: useSaved ? user!.latitude! : mapLoc!.latitude,
        longitude: useSaved ? user!.longitude! : mapLoc!.longitude,
        items: cart.map(item => ({ productId: item.id, quantity: item.cartQuantity })),
        paymentMethod: 'cash',
      };
      if (selectedVoucher) orderPayload.voucherId = selectedVoucher.id;
      else if (promoResult?.valid && promoCode.trim()) orderPayload.promoCode = promoCode.trim();

      const order = await createOrder({ data: orderPayload });
      queryClient.invalidateQueries({ queryKey: ['my-vouchers'] });
      clearCart();
      setLocation(`/order-confirmed/${order.id}`);
    } catch (err: unknown) {
      toast({ title: t('orderPlacedError'), description: getErrorMessage(err), variant: "destructive" });
    }
  };

  const sectionClass = "bg-card border border-border/40 rounded-xl p-6 shadow-sm";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-10 flex flex-col lg:flex-row gap-8">

        {/* Left — form */}
        <div className="flex-1">
          <div className="mb-7">
            <p className="text-accent font-semibold text-xs uppercase tracking-[0.18em] mb-1.5">{t('order')}</p>
            <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-serif)' }}>
              {t('checkoutTitle')}
            </h1>
          </div>

          <form id="checkout-form" onSubmit={handleSubmit} className="space-y-5">

            {/* Contact info */}
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className={sectionClass}
            >
              <h2 className="font-bold text-base mb-4">{t('contactInfo')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">{t('fullName')}</Label>
                  <Input
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="h-10 rounded-lg border-border/60 focus-visible:ring-primary/30 bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">{t('phoneNumber')}</Label>
                  <Input
                    required
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="h-10 rounded-lg border-border/60 focus-visible:ring-primary/30 bg-background"
                  />
                </div>
              </div>
            </motion.div>

            {/* Delivery */}
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.12, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className={`${sectionClass} space-y-5`}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-base">{t('deliveryLocation')}</h2>
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/50 border border-border/40 px-3 py-1 rounded-lg">
                  <Clock className="w-3 h-3" /> {t('deliveryTime')}
                </span>
              </div>

              {hasSavedLoc && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setUseSaved(true)}
                    className={`flex-1 h-10 rounded-lg text-sm font-medium border transition-all ${
                      useSaved
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-background border-border/60 text-muted-foreground hover:border-primary/30'
                    }`}
                  >
                    {t('useSavedLocation')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseSaved(false)}
                    className={`flex-1 h-10 rounded-lg text-sm font-medium border transition-all ${
                      !useSaved
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-background border-border/60 text-muted-foreground hover:border-primary/30'
                    }`}
                  >
                    {t('chooseNewLocation')}
                  </button>
                </div>
              )}

              {useSaved && hasSavedLoc ? (
                <>
                  <div className="bg-primary/5 border border-primary/15 rounded-lg p-4 flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{t('savedAddress')}</p>
                      <p className="text-sm text-muted-foreground">{user?.address || t('locationPinned')}</p>
                    </div>
                  </div>
                  {!savedZoneValid && (
                    <div className="flex items-start gap-3 bg-destructive/5 border border-destructive/20 rounded-lg p-3 text-destructive">
                      <Warning className="w-4 h-4 mt-0.5 shrink-0" />
                      <p className="text-sm">{t('outsideDeliveryZoneDesc')}</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <MapPicker
                    location={mapLoc}
                    onChange={(lat, lng) => setMapLoc({latitude: lat, longitude: lng})}
                    onZoneValidation={setMapZoneValid}
                  />
                  {!mapZoneValid && mapLoc && (
                    <div className="flex items-start gap-3 bg-destructive/5 border border-destructive/20 rounded-lg p-3 text-destructive">
                      <Warning className="w-4 h-4 mt-0.5 shrink-0" />
                      <p className="text-sm">{t('outsideDeliveryZoneDesc')}</p>
                    </div>
                  )}
                </>
              )}

              <div className="space-y-1.5">
                <Label className="text-sm">{t('deliveryNotes')}</Label>
                <Textarea
                  placeholder={t('deliveryNotesPlaceholder')}
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="rounded-lg resize-none border-border/60 focus-visible:ring-primary/30 bg-background"
                />
              </div>
            </motion.div>

            {/* Payment method */}
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className={sectionClass}
            >
              <h2 className="font-bold text-base mb-3">{t('paymentMethod')}</h2>
              <div className="flex items-center gap-3 p-4 rounded-lg border-2 border-primary bg-primary/5">
                <CheckCircle className="w-5 h-5 text-primary shrink-0" weight="fill" />
                <div>
                  <p className="font-semibold text-sm">{t('paymentCash')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('paymentCashDesc')}</p>
                </div>
              </div>
            </motion.div>
          </form>
        </div>

        {/* Right — order summary */}
        <motion.div
          initial={{ x: 16, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="w-full lg:w-88 shrink-0"
        >
          <div className="bg-card border border-border/40 rounded-xl p-6 sticky top-24 shadow-sm">
            <h3 className="font-bold text-lg mb-5 pb-4 border-b border-border/40">{t('orderSummary')}</h3>

            {/* Items */}
            <div className="space-y-2.5 mb-4">
              {cart.map((item: CartItem) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground truncate pe-3">{item.cartQuantity}× {lang === 'ar' ? item.nameAr : item.name}</span>
                  <span className="font-medium shrink-0">{(item.price * item.cartQuantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Promo / voucher */}
            <div className="border-t border-border/40 pt-4 mb-4">
              {discountDisplay ? (
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Ticket className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm font-medium text-primary">
                      {selectedVoucher ? t('voucherApplied') : `${t('promoApplied')}: ${discountDisplay.label}`}
                    </span>
                  </div>
                  <button type="button" onClick={clearDiscount} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 mb-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        value={promoCode}
                        onChange={e => { setPromoCode(e.target.value); setPromoResult(null); }}
                        placeholder={t('promoPlaceholder')}
                        className="ps-8 h-9 rounded-lg text-sm border-border/60 focus-visible:ring-primary/30 bg-background"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={applyPromo}
                      disabled={promoValidating || !promoCode.trim()}
                      className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {promoValidating ? <CircleNotch className="w-3.5 h-3.5 animate-spin" /> : <Sparkle className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {promoResult && !promoResult.valid && (
                    <p className="text-xs text-destructive">{promoResult.message}</p>
                  )}
                  {myVouchers.length > 0 && (
                    <Select onValueChange={(v) => {
                      const voucher = myVouchers.find(vr => vr.id === Number(v));
                      if (voucher) selectVoucher(voucher);
                    }}>
                      <SelectTrigger className="h-9 rounded-lg text-sm border-border/60 bg-background">
                        <SelectValue placeholder={t('voucherSelector')} />
                      </SelectTrigger>
                      <SelectContent>
                        {myVouchers.map(v => (
                          <SelectItem key={v.id} value={String(v.id)}>
                            {Number(v.amount).toFixed(2)} EGP — {t('voucherExpires')}{' '}
                            {v.validUntil ? new Date(v.validUntil).toLocaleDateString() : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="border-t border-border/40 pt-4 space-y-2 mb-5">
              {discountDisplay && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{t('subtotal')}</span><span>{total.toFixed(2)} EGP</span>
                </div>
              )}
              {deliveryFee > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{t('deliveryFee')}</span><span>{deliveryFee.toFixed(2)} EGP</span>
                </div>
              )}
              {discountDisplay && (
                <div className="flex justify-between text-sm text-primary">
                  <span>{discountDisplay.label}</span><span>-{discountDisplay.amount.toFixed(2)} EGP</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xl pt-2 border-t border-border/40">
                <span>{t('total')}</span>
                <span className="text-primary">{displayTotal.toFixed(2)} <span className="text-xs text-muted-foreground font-normal">EGP</span></span>
              </div>
            </div>

            <motion.button
              type="submit"
              form="checkout-form"
              disabled={isPending || !zoneValid || isProcessingPayment}
              whileHover={!isPending && zoneValid ? { scale: 1.02, boxShadow: 'var(--shadow-gold)' } : {}}
              whileTap={!isPending && zoneValid ? { scale: 0.97 } : {}}
              className="relative overflow-hidden w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-sm btn-gold-shimmer disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isPending || isProcessingPayment
                ? <CircleNotch className="w-5 h-5 animate-spin mx-auto" />
                : t('confirmOrder')
              }
            </motion.button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
