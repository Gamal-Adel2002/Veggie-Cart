import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useStore } from '@/store';
import { useTranslation } from '@/lib/i18n';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MapPicker } from '@/components/MapPicker';
import { useAppCreateOrder } from '@/hooks/use-auth-api';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, MapPin, CheckCircle2, Loader2, AlertTriangle, Leaf, ShoppingBag, Tag, Sparkles, Ticket, Trash2 } from 'lucide-react';
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

  // ── ALL hooks must be called unconditionally ─────────────────
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

  // ── Promo & Voucher state ──────────────────────────────────────────
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

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    notes: ''
  });

  // ── Payment method state ─────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState<'cash'>('cash');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  // Payment method forced to cash only - PayMob disabled until approval
  // ───────────────────────────────────────────────────────────────

  const hasSavedLoc = user && user.latitude && user.longitude;
  const [useSaved, setUseSaved] = useState(!!hasSavedLoc);
  const [mapLoc, setMapLoc] = useState<{latitude: number, longitude: number} | null>(null);
  const [mapZoneValid, setMapZoneValid] = useState(true);
  const [savedZoneValid, setSavedZoneValid] = useState(true);

  useEffect(() => {
    // Populate form defaults from user
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        notes: '',
      });
    }
  }, [user]);

  useEffect(() => {
    if (!hasSavedLoc || zones.length === 0) {
      setSavedZoneValid(true);
      return;
    }
    const inZone = zones.some(
      z => haversineKm(user!.latitude!, user!.longitude!, z.centerLat, z.centerLng) <= z.radiusKm
    );
    setSavedZoneValid(inZone);
  }, [zones, hasSavedLoc, user]);

  const applyPromo = async () => {
    if (!promoCode.trim()) return;
    // Clear any active voucher
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
        let amt: number;
        if (data.discountType === 'percentage') {
          amt = total * (data.discountValue / 100);
        } else {
          amt = data.discountValue;
        }
        amt = Math.min(amt, total);
        setDiscountDisplay({
          amount: Math.round(amt * 100) / 100,
          label: promoCode.trim().toUpperCase(),
        });
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
    // Defer discountDisplay update to next tick: Radix Select fires
    // onValueChange then closes its dropdown. If we call setDiscountDisplay
    // synchronously here, React batches it with the same render, unmounts the
    // Select before Radix finishes cleanup, and throws an error. Deferring
    // allows Radix to complete its teardown first.
    setTimeout(() => {
      setDiscountDisplay({
        amount: Math.round(amt * 100) / 100,
        label: String(t('voucherLabel')),
      });
    }, 0);
  };

  const clearDiscount = () => {
    setPromoCode('');
    setPromoResult(null);
    setSelectedVoucher(null);
    setDiscountDisplay(null);
  };
  // ── End Promo & Voucher ────────────────────────────────────────────

  const zoneValid = useSaved ? savedZoneValid : mapZoneValid;

  // ── Delivery fee calculation ─────────────────────────────────────────────
  let deliveryFee = 0;
  if (deliverySettings) {
    if (deliverySettings.feeType === "percentage") {
      deliveryFee = total * (deliverySettings.feeValue / 100);
    } else {
      deliveryFee = deliverySettings.feeValue;
    }
    if (deliverySettings.minimumFee > 0) {
      deliveryFee = Math.max(deliveryFee, deliverySettings.minimumFee);
    }
    deliveryFee = Math.round(deliveryFee * 100) / 100; // Round to 2 decimals
  }
  // ── End delivery fee ─────────────────────────────────────────────────────

  const discountedTotal = discountDisplay ? total - discountDisplay.amount : total;
  const displayTotal = discountedTotal + deliveryFee;

  // Auth gate: redirect to login if not authenticated
  if (!user) {
    setLocation('/auth/login');
    return null;
  }

  // Store closed gate
  if (!storeStatusLoading && storeStatus && !storeStatus.open) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAFAFA]">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white border border-red-100/60 rounded-3xl p-12 text-center max-w-md shadow-sm">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-foreground mb-2">{t('storeClosedTitle')}</h2>
            <p className="text-muted-foreground mb-6">{t('storeClosedDesc')}</p>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <Link href="/cart">
                <Button className="mt-6 rounded-2xl px-8 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white border-0 shadow-brand btn-shine">
                  {t('backToCart')}
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // Loading
  if (storeStatusLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAFAFA] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
      const orderPayload: CreateOrderInput = {
        customerName: formData.name,
        customerPhone: formData.phone,
        notes: formData.notes,
        latitude: useSaved ? user!.latitude! : mapLoc!.latitude,
        longitude: useSaved ? user!.longitude! : mapLoc!.longitude,
        items: cart.map(item => ({ productId: item.id, quantity: item.cartQuantity })),
        paymentMethod: 'cash', // Forced to cash since PayMob is disabled
      };
      if (selectedVoucher) {
        orderPayload.voucherId = selectedVoucher.id;
      } else if (promoResult?.valid && promoCode.trim()) {
        orderPayload.promoCode = promoCode.trim();
      }

      const order = await createOrder({
        data: orderPayload,
      });

      // Payment processing disabled for PayMob - using cash on delivery only
      // Step 2: If payment method was card (now disabled), fallback to cash
      if (paymentMethod === 'card') {
        // Show user-friendly message that card payments are temporarily disabled
        toast({ title: t('cardPaymentsDisabled'), description: t('useCashInstead'), variant: "destructive" });
        return;
      }

      // Cash on delivery: clear cart and show confirmation
      queryClient.invalidateQueries({ queryKey: ['my-vouchers'] });
      clearCart();
      setLocation(`/order-confirmed/${order.id}`);
    } catch (err: unknown) {
      toast({ title: t('orderPlacedError'), description: getErrorMessage(err), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA]">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-12 flex flex-col lg:flex-row gap-10">
        {/* Left — form */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          className="flex-1"
        >
          <h1 className="text-3xl font-display font-extrabold mb-8">{t('checkoutTitle')}</h1>

          <form id="checkout-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Contact */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
              className="bg-white border border-green-100/60 p-6 rounded-2xl shadow-sm"
            >
              <h2 className="text-xl font-bold mb-4">{t('contactInfo')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('fullName')}</Label>
                  <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="rounded-xl border-green-100 focus:border-[#16a34a] focus:ring-green-200" />
                </div>
                <div className="space-y-2">
                  <Label>{t('phoneNumber')}</Label>
                  <Input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="rounded-xl border-green-100 focus:border-[#16a34a] focus:ring-green-200" />
                </div>
              </div>
            </motion.div>

            {/* Delivery */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
              className="bg-white border border-green-100/60 p-6 rounded-2xl shadow-sm space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">{t('deliveryLocation')}</h2>
                <Badge className="bg-green-50 text-[#16a34a] border-green-200 gap-1 px-3 py-1 text-sm"><Clock className="w-3 h-3" /> {t('deliveryTime')}</Badge>
              </div>

              {hasSavedLoc && (
                <div className="flex gap-4">
                  <Button type="button" variant="default" className={`rounded-xl flex-1 h-12 ${useSaved ? 'bg-[#16a34a] shadow-sm' : 'bg-secondary border border-green-100'}`} onClick={() => setUseSaved(true)}>
                    {t('useSavedLocation')}
                  </Button>
                  <Button type="button" variant="default" className={`rounded-xl flex-1 h-12 ${!useSaved ? 'bg-[#16a34a] shadow-sm' : 'bg-secondary border border-green-100'}`} onClick={() => setUseSaved(false)}>
                    {t('chooseNewLocation')}
                  </Button>
                </div>
              )}

              {useSaved && hasSavedLoc ? (
                <>
                  <div className="bg-green-50/50 border border-green-100/60 rounded-xl p-4 flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-[#16a34a] mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">{t('savedAddress')}</p>
                      <p className="text-sm text-muted-foreground">{user?.address || t('locationPinned')}</p>
                    </div>
                  </div>
                  {!savedZoneValid && (
                    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-destructive">
                      <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                      <p className="text-sm font-medium">{t('outsideDeliveryZoneDesc')}</p>
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
                    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-destructive">
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
                  className="rounded-xl resize-none border-green-100 focus:border-[#16a34a] focus:ring-green-200"
                />
              </div>
            </motion.div>

            {/* Payment Method */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
              className="bg-white border border-green-100/60 p-6 rounded-2xl shadow-sm space-y-4"
            >
              <h2 className="text-xl font-bold flex items-center gap-2">
                💳 {t('paymentMethod')}
              </h2>

              <div className="space-y-4">
                <div className="p-4 rounded-xl border-2 text-left transition-all border-green-500 bg-green-50">
                  <div className="font-semibold">{t('paymentCash')}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {t('paymentCashDesc')}
                  </div>
                </div>
              </div>

              {paymentMethod === 'card' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
                  <p className="font-semibold mb-2">🔒 Secure Payment via PayMob</p>
                  <p className="text-xs leading-relaxed">
                    You will be redirected to PayMob's secure payment page to enter your card details.
                    We accept all major cards (Visa, MasterCard). Payment is encrypted and PCI-compliant.
                  </p>
                </div>
              )}

              {paymentError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {paymentError}
                </div>
              )}
            </motion.div>
          </form>
        </motion.div>

        {/* Right — order summary */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1], delay: 0.15 }}
          className="w-full lg:w-96 shrink-0"
        >
          <div className="bg-white border border-green-100/60 rounded-3xl p-6 sticky top-24 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-green-100 p-2 rounded-lg"><Leaf className="w-4 h-4 text-[#16a34a]" /></div>
              <h3 className="font-bold text-xl">{t('orderSummary')}</h3>
            </div>

            <div className="space-y-4 mb-6">
              {cart.map((item: CartItem) => (
                <motion.div
                  key={item.id}
                  initial={{ x: 10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="flex justify-between text-sm"
                >
                  <span className="text-muted-foreground truncate pe-4">{item.cartQuantity}x {lang === 'ar' ? item.nameAr : item.name}</span>
                  <span className="font-medium shrink-0">{(item.price * item.cartQuantity).toFixed(2)}</span>
                </motion.div>
              ))}
            </div>

            {/* Discount section */}
            {discountDisplay ? (
              <div className="border-t border-green-100/60 pt-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">
                      {selectedVoucher ? t('voucherApplied') : `${t('promoApplied')}: ${discountDisplay.label}`}
                    </span>
                  </div>
                  <button type="button" onClick={clearDiscount} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-700">{t('discount')}</span>
                  <span className="text-green-700 font-medium">-{discountDisplay.amount.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <div className="border-t border-green-100/60 pt-4 mb-4 space-y-3">
                {/* Promo code input */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      value={promoCode}
                      onChange={e => { setPromoCode(e.target.value); setPromoResult(null); }}
                      placeholder={t('promoPlaceholder')}
                      className="ps-8 rounded-xl border-green-100 focus:border-[#16a34a] h-10"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={applyPromo}
                    disabled={promoValidating || !promoCode.trim()}
                    size="sm"
                    className="rounded-xl h-10 px-3 bg-[#16a34a] hover:bg-[#15803d] text-white"
                  >
                    {promoValidating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  </Button>
                </div>
                {promoResult && !promoResult.valid && (
                  <p className="text-sm text-destructive">{promoResult.message}</p>
                )}

                {/* Voucher selector */}
                {myVouchers.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Select onValueChange={(v) => {
                      const voucher = myVouchers.find(vr => vr.id === Number(v));
                      if (voucher) selectVoucher(voucher);
                    }}>
                      <SelectTrigger className="rounded-xl border-green-100 focus:border-[#16a34a] h-10">
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
                  </div>
                )}
              </div>
            )}

            {/* Totals */}
            <div className="border-t border-green-100/60 pt-4 mb-8">
              {discountDisplay && (
                <div className="flex justify-between text-sm text-muted-foreground mb-1">
                  <span>{t('subtotal')}</span>
                  <span>{total.toFixed(2)}</span>
                </div>
              )}

              {deliveryFee > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground mb-1">
                  <span>{t('deliveryFee')}</span>
                  <span>{deliveryFee.toFixed(2)}</span>
                </div>
              )}

              {discountDisplay && (
                <div className="flex justify-between text-sm text-green-700 mb-1">
                  <span>{discountDisplay.label}</span>
                  <span>-{discountDisplay.amount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-2xl font-extrabold">
                <span>{t('total')}</span>
                <span className="text-[#16a34a]">{displayTotal.toFixed(2)} <span className="text-sm text-muted-foreground">EGP</span></span>
              </div>
            </div>

            {/* Payment method indication */}
            <div className={`p-4 rounded-xl flex items-center gap-3 mb-6 border ${
              paymentMethod === 'cash'
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}>
              {paymentMethod === 'cash' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : (
                <Loader2 className={`w-5 h-5 shrink-0 ${isProcessingPayment ? 'animate-spin' : ''}`} />
              )}
              <span className="text-sm font-medium">
                {paymentMethod === 'cash' ? t('paymentCash') : t('paymentCard')}
                {isProcessingPayment && ` (${t('processingPayment')})`}
              </span>
            </div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
              <Button
                type="submit"
                form="checkout-form"
                disabled={isPending || !zoneValid || isProcessingPayment}
                size="lg"
                className="w-full text-lg font-bold rounded-2xl h-14 bg-gradient-to-r from-[#16a34a] to-[#22c55e] hover:from-[#15803d] hover:to-[#16a34a] text-white border-0 shadow-brand btn-shine"
              >
                {(isPending || isProcessingPayment) ? <Loader2 className="w-5 h-5 animate-spin" /> : t('confirmOrder')}
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
