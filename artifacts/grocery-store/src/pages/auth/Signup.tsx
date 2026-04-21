import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppSignup, useAppUploadImage } from '@/hooks/use-auth-api';
import { useStore } from '@/store';
import { useLocation, Link } from 'wouter';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MapPicker } from '@/components/MapPicker';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { CircleNotch, Camera } from '@phosphor-icons/react';
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

export default function Signup() {
  const { t } = useTranslation();

  const schema = z.object({
    name: z.string().min(2, t('nameRequired')),
    phone: z.string().regex(/^0(10|11|12|15)\d{8}$/, t('invalidEgyptianPhone')),
    password: z.string().min(6, t('passwordMinLength')),
    address: z.string().optional()
  });

  const form = useForm({ resolver: zodResolver(schema), defaultValues: { name: '', phone: '', password: '', address: '' } });
  const { mutateAsync: signup, isPending } = useAppSignup();
  const { mutateAsync: uploadImage } = useAppUploadImage();
  const setAuth = useStore(s => s.setAuth);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [mapLoc, setMapLoc] = useState<{latitude: number, longitude: number} | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    if (!ALLOWED_IMAGE_TYPES.has(picked.type)) {
      toast({ title: t('unsupportedImageType'), variant: 'destructive' });
      e.target.value = '';
      return;
    }
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  };

  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      let imageUrl = '';
      if (file) {
        setUploading(true);
        const res = await uploadImage({ data: { file } });
        imageUrl = res.url;
        setUploading(false);
      }

      const res = await signup({
        data: {
          ...data,
          profileImage: imageUrl || undefined,
          latitude: mapLoc?.latitude,
          longitude: mapLoc?.longitude,
        }
      });
      setAuth(res.token, res.user);
      setLocation('/');
    } catch (e: unknown) {
      setUploading(false);
      const msg = getErrorMessage(e);
      const isAlreadyRegistered = msg?.toLowerCase().includes('already') || msg?.toLowerCase().includes('registered');
      toast({
        title: isAlreadyRegistered ? t('phoneAlreadyExists') : t('signupFailed'),
        description: isAlreadyRegistered ? undefined : (msg || t('errorCreatingAccount')),
        variant: "destructive",
      });
      if (isAlreadyRegistered) {
        form.setError('phone', { message: t('phoneAlreadyExists') });
      }
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-xl mx-auto bg-card border border-border/40 p-8 rounded-xl shadow-md"
      >
        {/* Brand */}
        <div className="text-center mb-7">
          <Link href="/" className="inline-flex flex-col items-center gap-2 mb-4">
            <BotanicalMark />
            <span className="font-display font-bold text-xl text-foreground">
              Fresh<span className="text-primary">Veg</span>
            </span>
          </Link>
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {t('createAccount')}
          </h1>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Avatar */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-muted border-2 border-dashed border-border overflow-hidden flex items-center justify-center">
                  {preview
                    ? <img src={preview} className="w-full h-full object-cover" alt="profile preview" />
                    : <Camera className="w-7 h-7 text-muted-foreground/50" />
                  }
                </div>
                <input type="file" id="profile" accept=".jpg,.jpeg,.png,.webp,.gif" className="hidden" onChange={handleFileChange} />
                <label
                  htmlFor="profile"
                  className="absolute -bottom-0.5 -right-0.5 w-7 h-7 bg-primary text-primary-foreground rounded-full cursor-pointer flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">{t('name')}</FormLabel>
                  <FormControl>
                    <Input {...field} className="h-11 rounded-lg border-border/60 focus-visible:ring-primary/30 bg-background" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">{t('phone')}</FormLabel>
                  <FormControl>
                    <Input {...field} className="h-11 rounded-lg border-border/60 focus-visible:ring-primary/30 bg-background" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">{t('password')}</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    {...field}
                    className="h-11 rounded-lg border-border/60 focus-visible:ring-primary/30 bg-background"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('deliveryLocationLabel')}</label>
              <MapPicker location={mapLoc} onChange={(lat, lng) => setMapLoc({latitude: lat, longitude: lng})} />
            </div>

            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">{t('apartmentDetails')}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    className="rounded-lg resize-none border-border/60 focus-visible:ring-primary/30 bg-background"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <motion.button
              type="submit"
              disabled={isPending || uploading}
              whileHover={!isPending && !uploading ? { scale: 1.02, boxShadow: 'var(--shadow-gold)' } : {}}
              whileTap={!isPending && !uploading ? { scale: 0.97 } : {}}
              className="relative overflow-hidden w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-sm btn-gold-shimmer disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 mt-1"
            >
              {isPending || uploading
                ? <CircleNotch className="w-5 h-5 animate-spin mx-auto" />
                : t('signUp')
              }
            </motion.button>
          </form>
        </Form>

        <p className="text-center text-muted-foreground text-sm mt-5">
          {t('alreadyHaveAccount')}{' '}
          <Link href="/auth/login" className="text-primary font-semibold hover:text-primary/80 transition-colors">
            {t('login')}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
