import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useStore } from '@/store';

interface RequireDeliveryProps {
  children: React.ReactNode;
}

export function RequireDelivery({ children }: RequireDeliveryProps) {
  const deliveryToken = useStore(s => s.deliveryToken);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!deliveryToken) {
      setLocation('/delivery/login');
    }
  }, [deliveryToken, setLocation]);

  if (!deliveryToken) {
    return null;
  }

  return <>{children}</>;
}
