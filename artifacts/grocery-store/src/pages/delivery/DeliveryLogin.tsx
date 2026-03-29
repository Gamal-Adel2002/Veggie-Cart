import React, { useState, useEffect } from 'react';
import { useStore } from '@/store';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { Truck, Loader2 } from 'lucide-react';

export default function DeliveryLogin() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const setDeliveryAuth = useStore(s => s.setDeliveryAuth);
  const deliveryToken = useStore(s => s.deliveryToken);
  const [, setLocation] = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (deliveryToken) setLocation('/delivery/dashboard');
  }, [deliveryToken, setLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/delivery/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Login failed');
      }
      const data = await res.json();
      setDeliveryAuth(data.token, data.person);
      setLocation('/delivery/dashboard');
    } catch {
      toast({ title: t('deliveryLoginFailed'), description: t('deliveryInvalidCredentials'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center text-primary">
            <Truck className="w-8 h-8" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white text-center mb-2">{t('deliveryLoginTitle')}</h1>
        <p className="text-zinc-400 text-center mb-8 text-sm">{t('deliveryLoginSubtitle')}</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-zinc-400 text-sm block mb-1">{t('deliveryUsername')}</label>
            <Input
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white h-12"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="text-zinc-400 text-sm block mb-1">{t('deliveryPassword')}</label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white h-12"
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full h-12 mt-4 text-lg">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('deliveryLogIn')}
          </Button>
        </form>
      </div>
    </div>
  );
}
