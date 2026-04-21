import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppAdminLogin } from '@/hooks/use-auth-api';
import { useStore } from '@/store';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Shield, Loader2, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';
import { useAdminTranslation } from '@/lib/portalI18n';

const schema = z.object({
  phone: z.string().min(1, "Required"),
  password: z.string().min(1, "Required")
});

export default function AdminLogin() {
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { phone: '', password: '' } });
  const { mutateAsync: login, isPending } = useAppAdminLogin();
  const setAuth = useStore(s => s.setAuth);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, lang, setLang } = useAdminTranslation();

  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      const res = await login({ data });
      if (res.user.role !== 'admin') throw new Error("Unauthorized");
      setAuth(res.token, res.user);
      setLocation('/admin');
    } catch (e: unknown) {
      toast({ title: t('adminAccessDenied'), description: getErrorMessage(e) || t('adminInvalidAdminCreds'), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center text-primary">
            <Shield className="w-8 h-8" />
          </div>
        </div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">{t('adminPortalTitle')}</h1>
          <button
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            className="flex items-center gap-1 text-sm font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span>{lang === 'en' ? 'AR' : 'EN'}</span>
          </button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem><FormLabel className="text-zinc-400">{t('adminLoginPhone')}</FormLabel><FormControl><Input {...field} className="bg-zinc-800 border-zinc-700 text-white h-12" /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem><FormLabel className="text-zinc-400">{t('password')}</FormLabel><FormControl><Input type="password" {...field} className="bg-zinc-800 border-zinc-700 text-white h-12" /></FormControl></FormItem>
            )} />
            <Button type="submit" disabled={isPending} className="w-full h-12 mt-4 text-lg">
              {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : t('adminAuthenticate')}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
