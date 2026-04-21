import React from 'react';
import { CustomerRealtimeSync } from '@/components/RealtimeSync';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="customer-theme bg-background text-foreground min-h-screen">
      <CustomerRealtimeSync />
      {children}
    </div>
  );
}
