import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppLogin } from '@/hooks/use-auth-api';
import { useStore } from '@/store';
import { useLocation, Link } from 'wouter';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { CircleNotch } from '@phosphor-icons/react';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { motion } from 'framer-motion';

function BotanicalMark() {
  return (
    <svg width="44" height="44" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="17" cy="17" r="17" fill="hsl(149 60% 26% / 0.12)" />
      <path d="M17 28C17 28 8 22.5 8 15.5C8 11.5 11.5 8.5 15 9.5C15.9 9.77 16.7 10.2 17 10.5C17.3 10.2 18.1 9.77 19 9.5C22.5 8.5 26 11.5 26 15.5C26 22.5 17 28 17 28Z" fill="hsl(149 60% 26%)" opacity="0.9" />
      <path d="M17 28V14" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M17 20C17 20 13 17 12 14" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeLinecap="round" />
      <path d="M17 18C17 18 20.5 15.5 22 13" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeLinecap="round" />
      <circle cx="22" cy="10" r="2.2" fill="hsl(36 63% 55%)" opacity="0.9" />
    </svg>
  );
}

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
      {/* Left panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md space-y-7"
        >
          {/* Brand */}
          <div className="text-center">
            <Link href="/" className="inline-flex flex-col items-center gap-2 mb-6">
              <BotanicalMark />
              <span className="font-display font-bold text-xl text-foreground">
                Fresh<span className="text-primary">Veg</span>
              </span>
            </Link>
            <h1
              className="text-3xl font-bold mb-1.5"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              {t('welcomeBack')}
            </h1>
            <p className="text-muted-foreground text-sm">{t('loginSubtitle')}</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">{t('phoneNumber')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="h-11 rounded-lg border-border/60 focus-visible:ring-primary/30 bg-card"
                      placeholder="01xxxxxxxxx"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">{t('password')}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      {...field}
                      className="h-11 rounded-lg border-border/60 focus-visible:ring-primary/30 bg-card"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <motion.button
                type="submit"
                disabled={isPending}
                whileHover={!isPending ? { scale: 1.02, boxShadow: 'var(--shadow-gold)' } : {}}
                whileTap={!isPending ? { scale: 0.97 } : {}}
                className="relative overflow-hidden w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-sm btn-gold-shimmer disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isPending ? <CircleNotch className="w-5 h-5 animate-spin mx-auto" /> : t('logIn')}
              </motion.button>
            </form>
          </Form>

          <p className="text-center text-muted-foreground text-sm">
            {t('noAccount')}{' '}
            <Link href="/auth/signup" className="text-primary font-semibold hover:text-primary/80 transition-colors">
              {t('signup')}
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right decorative panel */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden hero-animated-bg items-end p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/20 to-transparent" />
        <img
          src={`${import.meta.env.BASE_URL}images/auth-bg.png`}
          className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay"
          alt=""
        />
        <div className="relative z-10 text-white">
          <p className="text-accent text-xs font-semibold uppercase tracking-widest mb-2">Premium Grocery</p>
          <h2
            className="text-4xl font-bold leading-tight"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Fresh from<br />farm to door
          </h2>
          <p className="text-white/60 text-sm mt-3">Curated produce, delivered with care.</p>
        </div>
      </div>
    </div>
  );
}
