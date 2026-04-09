import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n';
import { getErrorMessage } from '@/lib/utils';
import { Truck, Loader2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

interface DeliverySettings {
  id?: number;
  feeType: 'fixed' | 'percentage';
  feeValue: number;
  minimumFee: number;
}

export default function DeliveryFee() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const { data: settings } = useQuery<DeliverySettings>({
    queryKey: ['admin-delivery-fee'],
    queryFn: () => apiFetch('/api/delivery-fee'),
  });

  const [formData, setFormData] = useState({
    feeType: 'fixed' as 'fixed' | 'percentage',
    feeValue: '0',
    minimumFee: '0',
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        feeType: settings.feeType,
        feeValue: String(settings.feeValue),
        minimumFee: String(settings.minimumFee),
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await apiFetch('/api/admin/delivery-fee', {
        method: 'PUT',
        body: JSON.stringify({
          feeType: formData.feeType,
          feeValue: Number(formData.feeValue),
          minimumFee: Number(formData.minimumFee),
        }),
      });
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-fee'] });
      toast({ title: t('adminDeliveryFeeSaved') });
    } catch (e: unknown) {
      toast({ title: t('adminDeliveryFeeError'), description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const calculatedPreview = () => {
    const val = Number(formData.feeValue) || 0;
    const min = Number(formData.minimumFee) || 0;
    const exampleTotals = [50, 100, 200, 500];
    return exampleTotals.map(total => {
      let fee = formData.feeType === 'percentage' ? total * (val / 100) : val;
      fee = Math.max(fee, min);
      return { total, fee };
    });
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Truck className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">{t('adminDeliveryFee')}</h2>
            <p className="text-muted-foreground text-sm mt-1">{t('adminDeliveryFeeDesc')}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold block mb-1">{t('adminDeliveryFeeType')}</label>
              <Select value={formData.feeType} onValueChange={(v: 'fixed' | 'percentage') => setFormData({...formData, feeType: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">{t('adminDeliveryFeeFixed')}</SelectItem>
                  <SelectItem value="percentage">{t('adminDeliveryFeePercent')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-semibold block mb-1">
                {formData.feeType === 'fixed' ? t('adminDeliveryFeeAmount') : t('adminDeliveryFeePercentValue')}
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.feeValue}
                onChange={e => setFormData({...formData, feeValue: e.target.value})}
                placeholder={formData.feeType === 'fixed' ? 'e.g. 30' : 'e.g. 10'}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold block mb-1">{t('adminDeliveryFeeMinimum')}</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.minimumFee}
              onChange={e => setFormData({...formData, minimumFee: e.target.value})}
              placeholder="e.g. 15"
            />
          </div>

          {/* Preview */}
          <div className="bg-muted rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-2">{t('adminDeliveryFeePreview')}</h3>
            <div className="space-y-1">
              {calculatedPreview().map(p => (
                <div key={p.total} className="flex justify-between text-sm">
                  <span>{p.total.toFixed(2)} EGP</span>
                  <span>→ {p.fee.toFixed(2)} EGP</span>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : t('adminDeliveryFeeSaveBtn')}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
