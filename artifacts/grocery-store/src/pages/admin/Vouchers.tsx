import React, { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAdminTranslation as useTranslation } from '@/lib/portalI18n';
import { Search, Ticket, Plus, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Voucher {
  id: number;
  userId: number | null;
  customerPhone: string | null;
  amount: number;
  used: boolean;
  usedAt: string | null;
  usedInOrderId: number | null;
  validUntil: string;
  createdAt: string;
  user?: { id: number; name: string; phone: string } | null;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
}

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

export default function Vouchers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([]);
  const [amount, setAmount] = useState('');
  const [validDays, setValidDays] = useState('7');

  const { data: vouchers = [], isLoading } = useQuery<Voucher[]>({
    queryKey: ['admin-vouchers'],
    queryFn: () => apiFetch('/api/admin/vouchers'),
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['admin-customers'],
    queryFn: () => apiFetch('/api/admin/customers'),
  });

  const [customerSearch, setCustomerSearch] = useState('');
  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(c => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q));
  }, [customers, customerSearch]);

  const filteredVouchers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vouchers;
    return vouchers.filter(v => {
      const name = v.user?.name ?? '';
      const phone = v.customerPhone ?? '';
      return name.toLowerCase().includes(q) || phone.toLowerCase().includes(q) || String(v.id).includes(q);
    });
  }, [vouchers, search]);

  const toggleCustomer = (id: number) => {
    setSelectedCustomers(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (selectedCustomers.length === 0) {
      toast({ title: t('adminVoucherSelectCustomer'), variant: 'destructive' });
      return;
    }
    const amt = Number(amount);
    const days = Number(validDays);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast({ title: t('adminVoucherValidAmount'), variant: 'destructive' });
      return;
    }
    if (!Number.isFinite(days) || days <= 0) {
      toast({ title: t('adminVoucherValidDays'), variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await Promise.all(
        selectedCustomers.map(cId => apiFetch('/api/admin/vouchers', {
          method: 'POST',
          body: JSON.stringify({ userId: cId, amount: amt, validDays: days }),
        }))
      );
      queryClient.invalidateQueries({ queryKey: ['admin-vouchers'] });
      toast({ title: t('adminVoucherCreated') });
      setSelectedCustomers([]);
      setAmount('');
      setValidDays('7');
      setCustomerSearch('');
      setDialogOpen(false);
    } catch (e: unknown) {
      toast({ title: t('adminVoucherError'), description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">{t('adminVouchers')}</h2>
          <p className="text-muted-foreground text-sm mt-1">{t('adminVouchersDesc')}</p>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          <Ticket className="w-3.5 h-3.5 me-1.5" />
          {vouchers.length}
        </Badge>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('adminVoucherSearch')} className="ps-9" />
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 me-1" />{t('adminVoucherAdd')}</Button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('adminVoucherIdCol')}</TableHead>
              <TableHead>{t('adminVoucherCustomerCol')}</TableHead>
              <TableHead>{t('adminVoucherAmountCol')}</TableHead>
              <TableHead>{t('adminVoucherStatusCol')}</TableHead>
              <TableHead>{t('adminVoucherValidUntilCol')}</TableHead>
              <TableHead>{t('adminVoucherCreatedCol')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('adminLoading')}</TableCell></TableRow>
            )}
            {!isLoading && filteredVouchers.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{search ? t('adminNoMatch') : t('adminVoucherEmpty')}</TableCell></TableRow>
            )}
            {filteredVouchers.map(v => (
              <TableRow key={v.id}>
                <TableCell className="text-muted-foreground">#{v.id}</TableCell>
                <TableCell>
                  <span className="font-medium">{v.user?.name || v.customerPhone || '—'}</span>
                  {v.user && <span className="text-sm text-muted-foreground ms-2 font-mono">({v.user.phone})</span>}
                </TableCell>
                <TableCell className="font-medium">{v.amount.toFixed(2)} {t('adminCurrencyLabel')}</TableCell>
                <TableCell>
                  {v.used ? (
                    <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />{t('adminVoucherUsed')}</Badge>
                  ) : (
                    <Badge className="gap-1 bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3" />{t('adminVoucherAvailable')}</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{format(new Date(v.validUntil), 'MMM dd, yyyy')}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{format(new Date(v.createdAt), 'MMM dd, yyyy')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) setDialogOpen(false); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('adminVoucherCreate')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-semibold block mb-1">{t('adminVoucherSelectCustomersLabel')}</label>
              <Input
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                placeholder={t('adminVoucherSearchCustomers')}
                className="mb-2"
              />
              <div className="border rounded-lg max-h-48 overflow-y-auto space-y-0.5 p-1">
                {filteredCustomers.slice(0, 30).map(c => (
                  <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm">
                    <Checkbox checked={selectedCustomers.includes(c.id)} onCheckedChange={() => toggleCustomer(c.id)} />
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted-foreground font-mono text-xs">{c.phone}</span>
                  </label>
                ))}
                {filteredCustomers.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">{t('adminVoucherNoCustomers')}</p>
                )}
              </div>
              {selectedCustomers.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{selectedCustomers.length} {t('adminVoucherSelected')}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold block mb-1">{t('adminVoucherAmountLabel')} ({t('adminCurrencyLabel')})</label>
                <Input type="number" min="1" step="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder={t('adminVoucherAmountPlaceholder')} />
              </div>
              <div>
                <label className="text-sm font-semibold block mb-1">{t('adminVoucherValidDaysLabel')}</label>
                <Input type="number" min="1" step="1" value={validDays} onChange={e => setValidDays(e.target.value)} placeholder={t('adminVoucherValidDaysPlaceholder')} />
              </div>
            </div>

            <Button onClick={handleCreate} disabled={loading || selectedCustomers.length === 0 || !amount || !validDays} className="w-full">
              {loading ? t('adminSaving') : t('adminVoucherCreateBtn')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
