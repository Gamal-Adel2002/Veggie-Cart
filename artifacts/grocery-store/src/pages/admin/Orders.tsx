import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAppAdminOrders, useAppUpdateOrderStatus, useAppAssignDelivery, useAppDeliveryPersons } from '@/hooks/use-auth-api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { Order } from '@workspace/api-client-react';
import { ExternalLink } from 'lucide-react';

const statuses = ['waiting', 'accepted', 'rejected', 'preparing', 'with_delivery', 'completed'] as const;

export default function Orders() {
  const { data: orders } = useAppAdminOrders();
  const { data: deliveryPersons } = useAppDeliveryPersons();
  const { mutateAsync: updateStatus } = useAppUpdateOrderStatus();
  const { mutateAsync: assignDelivery } = useAppAssignDelivery();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<any>('');
  const [deliveryId, setDeliveryId] = useState<string>('');
  const [waMessage, setWaMessage] = useState<{phone: string, text: string}|null>(null);

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !newStatus) return;
    try {
      await updateStatus({ id: selectedOrder.id, data: { status: newStatus } });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      toast({ title: "Status Updated" });
      setSelectedOrder(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleAssign = async () => {
    if (!selectedOrder || !deliveryId) return;
    try {
      const res = await assignDelivery({ id: selectedOrder.id, data: { deliveryPersonId: Number(deliveryId) } });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      
      const dp = deliveryPersons?.find(d => d.id === Number(deliveryId));
      if (res.whatsappMessage && dp) {
        setWaMessage({ phone: dp.phone, text: res.whatsappMessage });
      }
      setSelectedOrder(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders?.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">#{order.id}</TableCell>
                <TableCell>{order.customerName}</TableCell>
                <TableCell>{format(new Date(order.createdAt), 'MMM dd, HH:mm')}</TableCell>
                <TableCell>{order.totalPrice} EGP</TableCell>
                <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                <TableCell>
                  <Button variant="secondary" size="sm" onClick={() => {
                    setSelectedOrder(order);
                    setNewStatus(order.status);
                    setDeliveryId(order.deliveryPersonId?.toString() || '');
                  }}>Manage</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Manage Order #{selectedOrder?.id}</DialogTitle></DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Update Status</label>
              <div className="flex gap-2">
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statuses.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={handleUpdateStatus}>Update</Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Assign Delivery</label>
              <div className="flex gap-2">
                <Select value={deliveryId} onValueChange={setDeliveryId}>
                  <SelectTrigger><SelectValue placeholder="Select Staff" /></SelectTrigger>
                  <SelectContent>
                    {deliveryPersons?.filter(d => d.active).map(d => (
                      <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="secondary" onClick={handleAssign}>Assign & WA</Button>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-xl text-sm space-y-1">
              <p><strong>Customer:</strong> {selectedOrder?.customerName} ({selectedOrder?.customerPhone})</p>
              <p><strong>Items:</strong> {selectedOrder?.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Modal */}
      <Dialog open={!!waMessage} onOpenChange={(open) => !open && setWaMessage(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>WhatsApp Message Generated</DialogTitle></DialogHeader>
          <div className="bg-green-50 dark:bg-green-950 p-4 rounded-xl font-mono text-xs whitespace-pre-wrap text-green-900 dark:text-green-300 max-h-60 overflow-y-auto">
            {waMessage?.text}
          </div>
          <DialogFooter>
            <Button onClick={() => {
              window.open(`https://wa.me/${waMessage?.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waMessage?.text || '')}`);
              setWaMessage(null);
            }} className="w-full bg-green-600 hover:bg-green-700 text-white">
              Open WhatsApp <ExternalLink className="w-4 h-4 ms-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
