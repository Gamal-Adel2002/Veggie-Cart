import React from 'react';
import { Link } from 'wouter';
import { Plus } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/store';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@workspace/api-client-react';

export function ProductCard({ product }: { product: Product }) {
  const { t, lang } = useTranslation();
  const addToCart = useStore(s => s.addToCart);
  const { toast } = useToast();

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
    toast({
      title: "Added to Cart",
      description: `${lang === 'ar' ? product.nameAr : product.name} added successfully.`
    });
  };

  const name = lang === 'ar' ? product.nameAr : product.name;
  
  return (
    <Link href={`/product/${product.id}`}>
      <Card className="h-full flex flex-col group cursor-pointer overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-500 hover:shadow-xl hover:shadow-primary/5 bg-card">
        <div className="relative aspect-[4/3] bg-muted/30 p-6 flex items-center justify-center overflow-hidden">
          {product.image ? (
            <img 
              src={product.image} 
              alt={name}
              className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700 ease-out"
            />
          ) : (
            <div className="w-full h-full bg-secondary rounded-xl flex items-center justify-center text-muted-foreground">
              No Image
            </div>
          )}
          {product.featured && (
            <Badge className="absolute top-3 start-3 bg-accent text-accent-foreground border-none">
              Featured
            </Badge>
          )}
        </div>
        <CardContent className="p-5 flex-1 flex flex-col gap-1">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
            {lang === 'ar' ? product.category?.nameAr : product.category?.name}
          </div>
          <h3 className="font-display font-bold text-lg text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {name}
          </h3>
          <p className="text-muted-foreground font-medium mt-auto text-lg flex items-baseline gap-1">
            <span className="text-foreground">{product.price}</span>
            <span className="text-sm">EGP / {product.unit}</span>
          </p>
        </CardContent>
        <div className="px-5 pb-5 pt-0">
          <Button 
            onClick={handleAdd}
            className="w-full rounded-xl font-bold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground shadow-none hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 group/btn"
          >
            <Plus className="w-4 h-4 me-2 group-hover/btn:rotate-90 transition-transform duration-300" />
            {t('addToCart')}
          </Button>
        </div>
      </Card>
    </Link>
  );
}
