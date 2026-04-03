import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppSignup, useAppUploadImage } from '@/hooks/use-auth-api';
import { useStore } from '@/store';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MapPicker } from '@/components/MapPicker';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Sprout, Loader2, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreview(URL.createObjectURL(e.target.files[0]));
    }
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
      <div className="max-w-xl mx-auto space-y-8 bg-card border border-border/50 p-8 rounded-3xl shadow-xl shadow-black/5">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 text-primary">
            <Sprout className="w-8 h-8" />
            <span className="font-display font-bold text-2xl text-foreground">FreshVeg</span>
          </Link>
          <h1 className="text-3xl font-display font-bold">{t('createAccount')}</h1>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-muted border-2 border-dashed border-border overflow-hidden flex items-center justify-center">
                  {preview ? <img src={preview} className="w-full h-full object-cover" /> : <Camera className="w-8 h-8 text-muted-foreground opacity-50" />}
                </div>
                <input type="file" id="profile" accept="image/*" className="hidden" onChange={handleFileChange} />
                <label htmlFor="profile" className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-2 rounded-full cursor-pointer hover:bg-primary/90 shadow-md">
                  <Camera className="w-4 h-4" />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>{t('name')}</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>{t('phone')}</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem><FormLabel>{t('password')}</FormLabel><FormControl><Input type="password" {...field} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
            )} />

            <div className="space-y-3">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{t('deliveryLocationLabel')}</label>
              <MapPicker location={mapLoc} onChange={(lat, lng) => setMapLoc({latitude: lat, longitude: lng})} />
            </div>

            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem><FormLabel>{t('apartmentDetails')}</FormLabel><FormControl><Textarea {...field} className="rounded-xl resize-none" /></FormControl><FormMessage /></FormItem>
            )} />

            <Button type="submit" disabled={isPending || uploading} className="w-full h-14 rounded-xl text-lg font-bold shadow-lg shadow-primary/20">
              {isPending || uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('signUp')}
            </Button>
          </form>
        </Form>
        <p className="text-center text-muted-foreground mt-4">
          {t('alreadyHaveAccount')} <Link href="/auth/login" className="text-primary font-bold hover:underline">{t('login')}</Link>
        </p>
      </div>
    </div>
  );
}
