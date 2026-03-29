import React, { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useAppProduct } from '@/hooks/use-auth-api';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { useRoute } from 'wouter';
import { Loader2, Minus, Plus, ShoppingCart, ArrowLeft } from 'lucide-react';
import { useStore } from '@/store';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function ProductDetail() {
  const [, params] = useRoute('/product/:id');
  const id = Number(params?.id);
  const { data: product, isLoading } = useAppProduct(id);
  const { t, lang } = useTranslation();
  const addToCart = useStore(s => s.addToCart);
  const [qty, setQty] = useState(1);
  const { toast } = useToast();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!product) return <div>Product not found</div>;

  const name = lang === 'ar' ? product.nameAr : product.name;
  const description = lang === 'ar' ? product.descriptionAr : product.description;
  const categoryName = lang === 'ar' ? product.category?.nameAr : product.category?.name;

  const handleAdd = () => {
    addToCart(product, qty);
    toast({ title: "Added to Cart", description: `${qty} x ${name} added.` });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <Button variant="ghost" className="mb-8" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4 me-2" /> Back
        </Button>

        <div className="bg-card rounded-3xl border border-border/50 shadow-xl shadow-black/5 overflow-hidden flex flex-col md:flex-row">
          <div className="md:w-1/2 bg-muted/20 p-12 flex items-center justify-center relative">
            {product.image ? (
              <img src={product.image} alt={name} className="w-full max-w-md h-auto object-contain drop-shadow-2xl" />
            ) : (
              <div className="w-full aspect-square bg-secondary rounded-2xl flex items-center justify-center text-muted-foreground">
                No Image
              </div>
            )}
            {product.featured && <Badge className="absolute top-6 start-6 bg-accent border-none text-accent-foreground px-3 py-1">Featured</Badge>}
          </div>

          <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
            <Badge variant="outline" className="w-fit mb-4 text-primary border-primary/20 bg-primary/5">{categoryName}</Badge>
            <h1 className="text-4xl md:text-5xl font-display font-extrabold text-foreground mb-4">{name}</h1>
            <p className="text-3xl font-bold text-primary mb-6">{product.price} <span className="text-lg text-muted-foreground font-medium">EGP / {product.unit}</span></p>
            
            <p className="text-muted-foreground text-lg mb-10 leading-relaxed border-t border-border/50 pt-6">
              {description || "Fresh and locally sourced. Perfect for your daily cooking needs."}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mt-auto">
              <div className="flex items-center border-2 border-border rounded-xl h-14 bg-background px-2 w-full sm:w-40">
                <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-lg hover:bg-muted" onClick={() => setQty(Math.max(1, qty - 1))}>
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="flex-1 text-center font-bold text-lg">{qty}</span>
                <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-lg hover:bg-muted" onClick={() => setQty(qty + 1)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <Button onClick={handleAdd} size="lg" className="h-14 flex-1 rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 text-lg font-bold">
                <ShoppingCart className="w-5 h-5 me-3" />
                {t('addToCart')}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
