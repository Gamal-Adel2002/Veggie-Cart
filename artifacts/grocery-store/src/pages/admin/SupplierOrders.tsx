import React, { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAppSupplierOrders, useAppCreateSupplierOrder, useAppDeleteSupplierOrder, useAppSuppliers } from '@/hooks/use-auth-api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Trash2, Search, Loader2, ShoppingCart, ChevronDown, ChevronUp, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';
import { useAdminTranslation } from '@/lib/portalI18n';
import type { SupplierOrder } from '@workspace/api-client-react';

interface LineItem { productName: string; quantity: string; unitPrice: string; }

const emptyLine = (): LineItem => ({ productName: '', quantity: '', unitPrice: '' });

export default function SupplierOrders() {
  const { data: orders, isLoading } = useAppSupplierOrders();
  const { data: suppliers } = useAppSuppliers();
  const { mutateAsync: createOrder } = useAppCreateSupplierOrder();
  const { mutateAsync: deleteOrder } = useAppDeleteSupplierOrder();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useAdminTranslation();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SupplierOrder | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [supplierId, setSupplierId] = useState('');
  const [orderedAt, setOrderedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !orders) return orders || [];
    return orders.filter(o =>
      String(o.id).includes(q) ||
      (o.supplier?.name || '').toLowerCase().includes(q)
    );
  }, [orders, search]);

  const runningTotal = useMemo(() =>
    lines.reduce((sum, l) => {
      const q = parseFloat(l.quantity);
      const p = parseFloat(l.unitPrice);
      return sum + (isNaN(q) || isNaN(p) ? 0 : q * p);
    }, 0),
    [lines]
  );

  const openNew = () => {
    setSupplierId('');
    setOrderedAt(new Date().toISOString().slice(0, 16));
    setNotes('');
    setLines([emptyLine()]);
    setDialogOpen(true);
  };

  const updateLine = (idx: number, field: keyof LineItem, value: string) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const addLine = () => setLines(prev => [...prev, emptyLine()]);
  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!supplierId) {
      toast({ title: t('adminPurchaseOrderSupplierReq'), description: t('adminPurchaseOrderSelectSupplier'), variant: 'destructive' });
      return;
    }
    const validLines = lines.filter(l => l.productName.trim());
    if (validLines.length === 0) {
      toast({ title: t('adminPurchaseOrderItemsRequired'), description: t('adminPurchaseOrderItemsAddOne'), variant: 'destructive' });
      return;
    }
    for (const l of validLines) {
      if (!l.productName.trim() || !l.quantity || !l.unitPrice) {
        toast({ title: t('adminPurchaseOrderIncompleteItem'), description: `Fill in all fields for "${l.productName || 'item'}".`, variant: 'destructive' });
        return;
      }
      const q = parseFloat(l.quantity);
      const p = parseFloat(l.unitPrice);
      if (isNaN(q) || q <= 0 || isNaN(p) || p < 0) {
        toast({ title: t('adminPurchaseOrderInvalidValues'), description: `Quantity and unit price must be positive numbers.`, variant: 'destructive' });
        return;
      }
    }

    setSaving(true);
    try {
      await createOrder({
        data: {
          supplierId: Number(supplierId),
          orderedAt: new Date(orderedAt).toISOString(),
          notes: notes.trim() || undefined,
          items: validLines.map(l => ({
            productName: l.productName.trim(),
            quantity: parseFloat(l.quantity),
            unitPrice: parseFloat(l.unitPrice),
          })),
        }
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/supplier-orders'] });
      toast({ title: t('adminPurchaseOrderCreated') });
      setDialogOpen(false);
    } catch (e) {
      toast({ title: t('adminOrderError'), description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteOrder({ id: deleteTarget.id });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/supplier-orders'] });
      toast({ title: t('adminPurchaseOrderDeleted') });
    } catch (e) {
      toast({ title: t('adminOrderError'), description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" /> {t('adminPurchaseOrdersTitle')}
        </h2>
        <Button onClick={openNew}><Plus className="w-4 h-4 me-2" /> {t('adminPurchaseOrdersNewBtn')}</Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('adminPurchaseOrdersSearch')} className="ps-9" />
      </div>

      <div className="space-y-3">
        {isLoading && <p className="text-center py-8 text-muted-foreground">{t('adminLoading')}</p>}
        {!isLoading && filtered.length === 0 && (
          <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">
            {search ? t('adminPurchaseOrdersNoMatch') : t('adminPurchaseOrdersEmpty')}
          </div>
        )}
        {filtered.map(order => (
          <div key={order.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="font-bold">{t('adminPurchaseOrderEntry')(order.id)}</span>
                  <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {order.supplier?.name || t('adminPurchaseOrderSupplierFallback')(order.supplierId)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {format(new Date(order.orderedAt), 'MMM dd, yyyy – hh:mm a')} · {t('adminPurchaseOrderItemsCount')(order.items.length)}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-bold text-lg">{order.totalPrice.toFixed(2)} EGP</span>
                <Button
                  variant="ghost" size="icon"
                  onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                >
                  {expandedId === order.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteTarget(order)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {expandedId === order.id && (
              <div className="border-t border-border/50 px-5 py-4">
                {order.notes && <p className="text-sm text-muted-foreground mb-3 italic">"{order.notes}"</p>}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border/50">
                      <th className="text-start pb-2 font-medium">{t('adminPurchaseOrderProduct')}</th>
                      <th className="text-end pb-2 font-medium">{t('adminQtyCol')}</th>
                      <th className="text-end pb-2 font-medium">{t('adminPurchaseOrderUnitPrice')}</th>
                      <th className="text-end pb-2 font-medium">{t('adminSubtotalCol')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map(item => (
                      <tr key={item.id} className="border-b border-border/30 last:border-0">
                        <td className="py-1.5 font-medium">{item.productName}</td>
                        <td className="py-1.5 text-end">{item.quantity}</td>
                        <td className="py-1.5 text-end">{item.unitPrice.toFixed(2)}</td>
                        <td className="py-1.5 text-end font-semibold">{item.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="pt-2 text-end font-bold">{t('adminTotal')}</td>
                      <td className="pt-2 text-end font-bold text-primary">{order.totalPrice.toFixed(2)} EGP</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) setDialogOpen(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('adminPurchaseOrderNew')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div>
              <label className="text-sm font-semibold block mb-1">{t('adminPurchaseOrderSupplierReq')}</label>
              <select
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">{t('adminPurchaseOrderSelectSupplier')}</option>
                {(suppliers || []).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold block mb-1">{t('adminPurchaseOrderDateTime')}</label>
              <Input
                type="datetime-local"
                value={orderedAt}
                onChange={e => setOrderedAt(e.target.value)}
                className="h-9"
              />
            </div>

            <div>
              <label className="text-sm font-semibold block mb-1">{t('adminPurchaseOrderNotes')}</label>
              <Input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={t('adminPurchaseOrderNotesPlaceholder')}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">{t('adminPurchaseOrderItemsLabel')}</label>
                <Button variant="outline" size="sm" onClick={addLine} className="h-7 text-xs gap-1">
                  <Plus className="w-3 h-3" /> {t('adminPurchaseOrderAddRow')}
                </Button>
              </div>
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-start px-3 py-2 font-medium">{t('adminPurchaseOrderProductName')}</th>
                      <th className="text-end px-3 py-2 font-medium w-24">{t('adminQtyCol')}</th>
                      <th className="text-end px-3 py-2 font-medium w-28">{t('adminPurchaseOrderUnitPrice')}</th>
                      <th className="text-end px-3 py-2 font-medium w-24">{t('adminSubtotalCol')}</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => {
                      const q = parseFloat(line.quantity);
                      const p = parseFloat(line.unitPrice);
                      const sub = isNaN(q) || isNaN(p) ? null : (q * p).toFixed(2);
                      return (
                        <tr key={idx} className="border-t border-border/50">
                          <td className="px-3 py-1.5">
                            <Input
                              value={line.productName}
                              onChange={e => updateLine(idx, 'productName', e.target.value)}
                              placeholder="e.g. Tomatoes"
                              className="h-8 text-sm"
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <Input
                              type="number" min="0" step="0.01"
                              value={line.quantity}
                              onChange={e => updateLine(idx, 'quantity', e.target.value)}
                              placeholder="0"
                              className="h-8 text-sm text-end"
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <Input
                              type="number" min="0" step="0.01"
                              value={line.unitPrice}
                              onChange={e => updateLine(idx, 'unitPrice', e.target.value)}
                              placeholder="0.00"
                              className="h-8 text-sm text-end"
                            />
                          </td>
                          <td className="px-3 py-1.5 text-end font-medium text-sm">
                            {sub !== null ? sub : '—'}
                          </td>
                          <td className="px-2 py-1.5">
                            {lines.length > 1 && (
                              <button onClick={() => removeLine(idx)} className="text-destructive hover:text-destructive/80">
                                <Minus className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between bg-primary/5 rounded-xl px-4 py-3">
              <span className="font-semibold text-sm">{t('adminTotal')}</span>
              <span className="font-bold text-primary">{runningTotal.toFixed(2)} EGP</span>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('adminZoneCancel')}</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('adminPurchaseOrderCreate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('adminPurchaseOrderDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && t('adminPurchaseOrderDeleteConfirm')(deleteTarget.id)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('adminZoneCancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('adminCustomerDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
