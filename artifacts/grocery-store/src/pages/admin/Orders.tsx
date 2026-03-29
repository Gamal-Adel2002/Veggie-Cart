import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAppAdminOrders, useAppUpdateOrderStatus, useAppAssignDelivery, useAppDeliveryPersons } from '@/hooks/use-auth-api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { type Order, UpdateOrderStatusInputStatus } from '@workspace/api-client-react';
import { getErrorMessage } from '@/lib/utils';

const updatableStatuses = Object.values(UpdateOrderStatusInputStatus) as Array<typeof UpdateOrderStatusInputStatus[keyof typeof UpdateOrderStatusInputStatus]>;

export default function Orders() {
  const { data: orders } = useAppAdminOrders();
  const { data: deliveryPersons } = useAppDeliveryPersons();
  const { mutateAsync: updateStatus } = useAppUpdateOrderStatus();
  const { mutateAsync: assignDelivery } = useAppAssignDelivery();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<typeof updatableStatuses[number] | ''>('');
  const [deliveryId, setDeliveryId] = useState<string>('');

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !newStatus) return;
    try {
      await updateStatus({ id: selectedOrder.id, data: { status: newStatus } });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      toast({ title: "Status Updated" });
      setSelectedOrder(null);
    } catch (e: unknown) {
      toast({ title: "Error", description: getErrorMessage(e), variant: "destructive" });
    }
  };

  const handleAssign = async () => {
    if (!selectedOrder || !deliveryId) return;
    try {
      const res = await assignDelivery({ id: selectedOrder.id, data: { deliveryPersonId: Number(deliveryId) } });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      setSelectedOrder(null);

      if (res.whatsappSent) {
        toast({ title: "Delivery Assigned", description: "WhatsApp message sent to delivery person." });
      } else {
        toast({
          title: "Delivery Assigned",
          description: "Order assigned, but WhatsApp message was not sent (Twilio not configured).",
          variant: "default",
        });
      }
    } catch (e: unknown) {
      toast({ title: "Error", description: getErrorMessage(e), variant: "destructive" });
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
                    setNewStatus(updatableStatuses.includes(order.status as typeof updatableStatuses[number]) ? order.status as typeof updatableStatuses[number] : '');
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
                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as typeof updatableStatuses[number])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {updatableStatuses.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
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
                <Button variant="secondary" onClick={handleAssign}>Assign</Button>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-xl text-sm space-y-1">
              <p><strong>Customer:</strong> {selectedOrder?.customerName} ({selectedOrder?.customerPhone})</p>
              <p><strong>Items:</strong> {selectedOrder?.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
