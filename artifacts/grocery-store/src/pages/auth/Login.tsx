import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppLogin } from '@/hooks/use-auth-api';
import { useStore } from '@/store';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Plant, CircleNotch } from '@phosphor-icons/react';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

export default function Login() {
  const { t } = useTranslation();

  const schema = z.object({
    phone: z.string().regex(/^0(10|11|12|15)\d{8}$/, t('invalidEgyptianPhone')),
    password: z.string().min(4, t('passwordRequired'))
  });

  const form = useForm({ resolver: zodResolver(schema), defaultValues: { phone: '', password: '' } });
  const { mutateAsync: login, isPending } = useAppLogin();
  const setAuth = useStore(s => s.setAuth);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      const res = await login({ data });
      setAuth(res.token, res.user);
      setLocation('/');
    } catch (e: unknown) {
      toast({ title: t('loginFailed'), description: getErrorMessage(e) || t('invalidCredentials'), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <Link href="/" className="inline-flex items-center gap-2 mb-8 text-primary">
              <Plant className="w-8 h-8" weight="fill" />
              <span className="font-display font-bold text-2xl text-foreground">FreshVeg</span>
            </Link>
            <h1 className="text-3xl font-display font-bold mb-2">{t('welcomeBack')}</h1>
            <p className="text-muted-foreground">{t('loginSubtitle')}</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('phoneNumber')}</FormLabel>
                  <FormControl><Input {...field} className="h-12 rounded-xl" placeholder="01xxxxxxxxx" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('password')}</FormLabel>
                  <FormControl><Input type="password" {...field} className="h-12 rounded-xl" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" disabled={isPending} className="w-full h-12 rounded-xl text-lg font-bold shadow-lg shadow-primary/20">
                {isPending ? <CircleNotch className="w-5 h-5 animate-spin" /> : t('logIn')}
              </Button>
            </form>
          </Form>

          <p className="text-center text-muted-foreground">
            {t('noAccount')} <Link href="/auth/signup" className="text-primary font-bold hover:underline">{t('signup')}</Link>
          </p>
        </div>
      </div>
      <div className="hidden lg:block lg:flex-1 relative overflow-hidden bg-primary/10">
        <img src={`${import.meta.env.BASE_URL}images/auth-bg.png`} className="absolute inset-0 w-full h-full object-cover opacity-80" alt="background" />
      </div>
    </div>
  );
}
