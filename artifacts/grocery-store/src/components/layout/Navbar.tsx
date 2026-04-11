import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import {
  ShoppingCart,
  User,
  SignOut,
  Translate,
  Plant,
  Megaphone,
  ChatCircle,
  Sun,
  Moon,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store';
import { useTranslation } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { useAppLogout } from '@/hooks/use-auth-api';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';

export function Navbar() {
  const { t, lang } = useTranslation();
  const setLang = useStore(s => s.setLang);
  const cart = useStore(s => s.cart);
  const user = useStore(s => s.user);
  const logoutAction = useStore(s => s.logout);
  const { mutate: logoutApi } = useAppLogout();
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const cartItemsCount = cart.reduce((acc, item) => acc + item.cartQuantity, 0);
  const toggleLang = () => setLang(lang === 'en' ? 'ar' : 'en');
  const handleLogout = () => { logoutApi(); logoutAction(); };
  const langLabel = lang === 'en' ? 'ع' : 'EN';
  const isDark = theme === 'dark';

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="sticky top-0 z-[100] w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="bg-primary/10 p-2 rounded-xl text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                <Plant className="w-6 h-6" weight="fill" />
              </div>
              <span className="font-display font-bold text-xl tracking-tight text-foreground hidden sm:block">
                FreshVeg
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1 ms-6">
              <Link href="/">
                <Button variant={location === '/' ? 'secondary' : 'ghost'} className="rounded-full px-5">
                  {t('home')}
                </Button>
              </Link>
              <Link href="/shop">
                <Button variant={location === '/shop' ? 'secondary' : 'ghost'} className="rounded-full px-5">
                  {t('shop')}
                </Button>
              </Link>
              <Link href="/feed">
                <Button variant={location === '/feed' ? 'secondary' : 'ghost'} className="rounded-full px-5 gap-1.5">
                  <Megaphone className="w-4 h-4" weight="fill" />
                  Feed
                </Button>
              </Link>
              {user && user.role === 'customer' && (
                <Link href="/messages">
                  <Button variant={location === '/messages' ? 'secondary' : 'ghost'} className="rounded-full px-5 gap-1.5">
                    <ChatCircle className="w-4 h-4" weight="fill" />
                    Messages
                  </Button>
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-1">
            {mounted && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className="rounded-full px-3 text-muted-foreground hover:text-primary"
                aria-label="Toggle theme"
              >
                {isDark
                  ? <Sun className="w-4 h-4" weight="bold" />
                  : <Moon className="w-4 h-4" weight="bold" />
                }
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLang}
              className="rounded-full px-3 gap-1.5 text-muted-foreground hover:text-primary"
            >
              <Translate className="w-4 h-4" weight="bold" />
              <span className="font-semibold text-sm">{langLabel}</span>
            </Button>

            <Link href="/cart">
              <Button
                variant={location === '/cart' ? 'secondary' : 'ghost'}
                size="sm"
                className="relative rounded-full px-3 gap-1.5 hover:text-primary"
              >
                <ShoppingCart className="w-4 h-4" weight={location === '/cart' ? 'fill' : 'regular'} />
                <span className="hidden sm:inline">{t('cart')}</span>
                {cartItemsCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 px-1.5 min-w-[1.25rem] h-5 flex items-center justify-center rounded-full text-[10px]">
                    {cartItemsCount}
                  </Badge>
                )}
              </Button>
            </Link>

            {user ? (
              <>
                <Link href={user.role === 'admin' ? '/admin' : '/account'}>
                  <Button
                    variant={location === '/account' || location === '/admin' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="rounded-full px-3 gap-1.5 hover:text-primary"
                  >
                    {user.profileImage ? (
                      <img src={user.profileImage} alt={user.name} className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <User className="w-4 h-4" weight="bold" />
                    )}
                    <span className="hidden sm:inline">{user.role === 'admin' ? t('admin') : t('account')}</span>
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="rounded-full px-3 gap-1.5 text-destructive hover:bg-destructive/10"
                >
                  <SignOut className="w-4 h-4" weight="bold" />
                  <span className="hidden sm:inline">{t('logout')}</span>
                </Button>
              </>
            ) : (
              <Link href="/auth/login">
                <Button className="rounded-full ms-1 font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 transition-all">
                  {t('login')}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
}
