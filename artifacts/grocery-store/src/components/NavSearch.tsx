import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n';
import { matchEgyptLocation } from '@/lib/egypt-locations';
import { useDebounce } from '@/hooks/use-debounce';
import { MagnifyingGlass, MapPin, ArrowRight } from '@phosphor-icons/react';

function isArabicText(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

function stripTashkeel(str: string): string {
  return str.replace(/[\u064B-\u065F\u0670]/g, '');
}

interface Product {
  id: number;
  name: string;
  nameAr: string;
  price: number;
  unit: string;
  image: string | null;
  inStock: boolean;
  category: { name: string; nameAr: string; icon: string } | null;
}

export function NavSearch() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { t, lang } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query.trim(), 280);
  const normalizedQuery = stripTashkeel(debouncedQuery);
  const isArabic = isArabicText(query);
  const locationMatch = matchEgyptLocation(normalizedQuery);

  const { data: suggestions } = useQuery<Product[]>({
    queryKey: ['/api/products', 'nav-search', normalizedQuery],
    queryFn: async () => {
      if (normalizedQuery.length < 2) return [];
      const res = await fetch(`/api/products?search=${encodeURIComponent(normalizedQuery)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: normalizedQuery.length >= 2,
    staleTime: 30_000,
  });

  const topSuggestions = suggestions?.slice(0, 6) ?? [];

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  const handleSearch = (q: string = query) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setOpen(false);
    setQuery('');
    setLocation(`/shop?search=${encodeURIComponent(trimmed)}`);
  };

  const handleProductClick = (id: number) => {
    setOpen(false);
    setQuery('');
    setLocation(`/products/${id}`);
  };

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative">
        <MagnifyingGlass
          className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
          weight="bold"
        />
        <Input
          ref={inputRef}
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSearch();
            if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
          }}
          placeholder={t('navSearchPlaceholder')}
          dir={isArabic ? 'rtl' : 'ltr'}
          className="ps-9 pe-4 h-9 rounded-full border-border/60 bg-background text-sm focus-visible:ring-primary/40 transition-all"
        />
      </div>

      {showDropdown && (
        <div className="absolute top-full mt-2 w-full min-w-[320px] bg-popover border border-border rounded-2xl shadow-xl z-[200] overflow-hidden">
          {locationMatch && (
            <div className="px-4 py-2.5 border-b border-border/50 bg-primary/5 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary shrink-0" weight="fill" />
              <span className="text-sm font-medium text-foreground">
                {t('navSearchDeliveryTo')(
                  lang === 'ar' ? locationMatch.location.ar : locationMatch.location.en
                )}
              </span>
              <Badge variant="secondary" className="ms-auto text-xs">
                {locationMatch.location.type}
              </Badge>
            </div>
          )}

          {topSuggestions.length > 0 ? (
            <>
              <ul className="py-1">
                {topSuggestions.map(product => (
                  <li key={product.id}>
                    <button
                      onClick={() => handleProductClick(product.id)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-start group"
                    >
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">
                            {product.category?.icon ?? '🥬'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {lang === 'ar' ? product.nameAr : product.name}
                        </p>
                        {lang === 'en' && product.nameAr && (
                          <p className="text-xs text-muted-foreground truncate" dir="rtl">
                            {product.nameAr}
                          </p>
                        )}
                        {lang === 'ar' && product.name && (
                          <p className="text-xs text-muted-foreground truncate" dir="ltr">
                            {product.name}
                          </p>
                        )}
                      </div>
                      <div className="text-end shrink-0">
                        <p className="text-sm font-semibold text-primary">
                          {product.price} {t('navSearchCurrencyLabel')}
                        </p>
                        {!product.inStock && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                            {t('outOfStock')}
                          </Badge>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSearch()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-t border-border/50 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
              >
                <span>{t('navSearchViewAll')(query.trim())}</span>
                <ArrowRight className="w-3.5 h-3.5" weight="bold" />
              </button>
            </>
          ) : normalizedQuery.length >= 2 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              {t('navSearchNoResults')}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
