import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import {
  ShoppingCart,
  User,
  SignOut,
  Translate,
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
import { NavSearch } from '@/components/NavSearch';
import { useStoreStatus } from '@/hooks/use-store-status';

function BotanicalLogo() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="17" cy="17" r="17" fill="hsl(149 60% 26% / 0.10)" />
      <path
        d="M17 28C17 28 8 22.5 8 15.5C8 11.5 11.5 8.5 15 9.5C15.9 9.77 16.7 10.2 17 10.5C17.3 10.2 18.1 9.77 19 9.5C22.5 8.5 26 11.5 26 15.5C26 22.5 17 28 17 28Z"
        fill="hsl(149 60% 26%)"
        opacity="0.85"
      />
      <path
        d="M17 28V14"
        stroke="hsl(0 0% 100% / 0.7)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M17 20C17 20 13 17 12 14"
        stroke="hsl(0 0% 100% / 0.5)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M17 18C17 18 20.5 15.5 22 13"
        stroke="hsl(0 0% 100% / 0.5)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <circle cx="22" cy="10" r="2.2" fill="hsl(36 63% 55%)" opacity="0.9" />
    </svg>
  );
}

export function Navbar() {
  const { t, lang } = useTranslation();
  const setLang = useStore(s => s.setLang);
  const cart = useStore(s => s.cart);
  const user = useStore(s => s.user);
  const logoutAction = useStore(s => s.logout);
  const { mutate: logoutApi } = useAppLogout();
  const [location, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { data: storeStatus } = useStoreStatus();

  useEffect(() => setMounted(true), []);

  const cartItemsCount = cart.reduce((acc, item) => acc + item.cartQuantity, 0);
  const toggleLang = () => setLang(lang === 'en' ? 'ar' : 'en');
  const handleLogout = () => { logoutApi(); logoutAction(); setLocation('/'); };
  const langLabel = lang === 'en' ? 'ع' : 'EN';
  const isDark = theme === 'dark';

  const navLinks = [
    { href: '/', label: t('home') },
    { href: '/shop', label: t('shop') },
    { href: '/feed', label: t('feed'), icon: Megaphone },
    ...(user && user.role === 'customer' ? [{ href: '/messages', label: t('messagesNav'), icon: ChatCircle }] : []),
  ];

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-[100] w-full border-b border-border/30 bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75 shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-[68px] items-center gap-4">

          {/* Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/" className="flex items-center gap-2.5 group">
              <motion.div whileHover={{ scale: 1.08 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}>
                <BotanicalLogo />
              </motion.div>
              <span className="font-display font-bold text-[1.2rem] tracking-tight text-foreground hidden sm:block">
                Fresh<span className="text-primary">Veg</span>
              </span>
            </Link>

            {/* Store open/closed status badge */}
            {storeStatus !== undefined && (
              <span
                className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                  storeStatus.open
                    ? 'bg-green-500/10 text-green-600 border-green-500/20'
                    : 'bg-red-500/10 text-red-500 border-red-500/20'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    storeStatus.open ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                  }`}
                />
                {storeStatus.open ? t('openStatus') : t('closedStatus')}
              </span>
            )}
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = location === href;
              return (
                <Link key={href} href={href}>
                  <button
                    className={`
                      flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      ${active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'}
                    `}
                  >
                    {Icon && <Icon className="w-4 h-4" weight={active ? 'fill' : 'regular'} />}
                    {label}
                    {active && <span className="w-1 h-1 rounded-full bg-primary ml-0.5" />}
                  </button>
                </Link>
              );
            })}
          </nav>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-xs mx-2">
            <NavSearch />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 shrink-0">
            {mounted && (
              <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                aria-label="Toggle theme"
              >
                {isDark
                  ? <Sun className="w-[18px] h-[18px]" weight="bold" />
                  : <Moon className="w-[18px] h-[18px]" weight="bold" />
                }
              </button>
            )}

            <button
              onClick={toggleLang}
              className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors text-sm font-semibold"
            >
              <Translate className="w-4 h-4" weight="bold" />
              {langLabel}
            </button>

            {/* Cart */}
            <Link href="/cart">
              <button
                className={`
                  relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${location === '/cart'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'}
                `}
              >
                <ShoppingCart className="w-[18px] h-[18px]" weight={location === '/cart' ? 'fill' : 'regular'} />
                <span className="hidden sm:inline">{t('cart')}</span>
                {cartItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                    {cartItemsCount}
                  </span>
                )}
              </button>
            </Link>

            {user ? (
              <>
                <Link href={user.role === 'admin' ? '/admin' : '/account'}>
                  <button
                    className={`
                      flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      ${location === '/account' || location === '/admin'
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'}
                    `}
                  >
                    {user.profileImage ? (
                      <img src={user.profileImage} alt={user.name} className="w-5 h-5 rounded-full object-cover ring-1 ring-primary/20" />
                    ) : (
                      <User className="w-4 h-4" weight="bold" />
                    )}
                    <span className="hidden sm:inline">{user.role === 'admin' ? t('admin') : t('account')}</span>
                  </button>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/8 transition-colors"
                >
                  <SignOut className="w-4 h-4" weight="bold" />
                  <span className="hidden sm:inline">{t('logout')}</span>
                </button>
              </>
            ) : (
              <Link href="/auth/login">
                <motion.button
                  whileHover={{ scale: 1.03, boxShadow: 'var(--shadow-gold)' }}
                  whileTap={{ scale: 0.97 }}
                  className="relative overflow-hidden ms-1 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-sm transition-all duration-200 btn-gold-shimmer hover:bg-primary/90"
                >
                  {t('login')}
                </motion.button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
}
