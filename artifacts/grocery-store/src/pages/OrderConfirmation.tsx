import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useRoute, Link } from 'wouter';
import { useAppOrder } from '@/hooks/use-auth-api';
import { CheckCircle, Package, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OrderConfirmation() {
  const [, params] = useRoute('/order-confirmed/:id');
  const id = Number(params?.id);
  const { data: order, isLoading } = useAppOrder(id);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {isLoading ? (
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        ) : !order ? (
          <p>Order not found</p>
        ) : (
          <div className="w-full max-w-lg bg-card border border-border/50 rounded-3xl p-8 sm:p-12 text-center shadow-xl shadow-primary/5">
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12" />
            </div>
            <h1 className="text-3xl font-display font-extrabold mb-2">Order Confirmed!</h1>
            <p className="text-muted-foreground mb-8">Thank you, {order.customerName}. Your fresh veggies are being prepared.</p>

            <div className="bg-muted/30 rounded-2xl p-6 text-left space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <Package className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Order ID</p>
                  <p className="font-bold">#{order.id.toString().padStart(6, '0')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Delivery to</p>
                  <p className="font-medium">{order.latitude?.toFixed(4)}, {order.longitude?.toFixed(4)}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-border/50 flex justify-between items-center font-bold">
                <span>Total Paid (Cash)</span>
                <span className="text-xl text-primary">{order.totalPrice} EGP</span>
              </div>
            </div>

            <Link href="/account">
              <Button size="lg" className="w-full rounded-xl h-12">Track Order Status</Button>
            </Link>
            <Link href="/shop" className="block mt-4 text-sm text-primary hover:underline font-medium">
              Continue Shopping
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
