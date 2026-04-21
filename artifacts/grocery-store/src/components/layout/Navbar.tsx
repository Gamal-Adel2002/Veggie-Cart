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
  List,
  X,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store';
import { useTranslation } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { useAppLogout } from '@/hooks/use-auth-api';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { NavSearch } from '@/components/NavSearch';
import { useStoreStatus } from '@/hooks/use-store-status';
import { MagnifyingGlass } from '@phosphor-icons/react';

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

function isArabicText(text: string) {
  return /[\u0600-\u06FF]/.test(text);
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState('');

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location]);

  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

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

  const handleMobileSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (mobileSearch.trim()) {
      setLocation(`/shop?search=${encodeURIComponent(mobileSearch.trim())}`);
      setDrawerOpen(false);
    }
  };

  return (
    <>
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

              {/* Store open/closed status badge — always visible */}
              {(() => {
                const isOpen = storeStatus?.open ?? null;
                if (isOpen === null) {
                  return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-muted/50 text-muted-foreground border-border/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                      <span className="hidden sm:inline">—</span>
                    </span>
                  );
                }
                return (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                      isOpen
                        ? 'bg-green-500/10 text-green-600 border-green-500/20'
                        : 'bg-red-500/10 text-red-500 border-red-500/20'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                      }`}
                    />
                    <span className="hidden sm:inline">
                      {isOpen ? t('openStatus') : t('closedStatus')}
                    </span>
                  </span>
                );
              })()}
            </div>

            {/* Nav links — desktop only */}
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

            {/* Search — desktop only */}
            <div className="hidden md:flex flex-1 max-w-xs mx-2">
              <NavSearch />
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1 shrink-0">
              {mounted && (
                <button
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  className="hidden md:flex p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
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
                className="hidden md:flex items-center gap-1 px-2.5 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors text-sm font-semibold"
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
                    className="hidden md:flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/8 transition-colors"
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

              {/* Hamburger — mobile only */}
              <button
                onClick={() => setDrawerOpen(v => !v)}
                className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                aria-label="Open menu"
              >
                <List className="w-5 h-5" weight="bold" />
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm md:hidden"
              onClick={() => setDrawerOpen(false)}
            />

            {/* Drawer panel */}
            <motion.div
              key="drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 bottom-0 z-[200] w-72 bg-background border-l border-border/40 shadow-2xl flex flex-col md:hidden"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-4 h-[68px] border-b border-border/30 shrink-0">
                <span className="font-display font-bold text-lg text-foreground">
                  Fresh<span className="text-primary">Veg</span>
                </span>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" weight="bold" />
                </button>
              </div>

              {/* Drawer content — scrollable */}
              <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-6">

                {/* Search */}
                <form onSubmit={handleMobileSearch}>
                  <div className="relative">
                    <MagnifyingGlass className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" weight="bold" />
                    <input
                      className="w-full ps-9 pe-4 h-10 rounded-lg border border-border/60 bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                      placeholder={t('navSearchPlaceholder')}
                      value={mobileSearch}
                      onChange={e => setMobileSearch(e.target.value)}
                      dir={isArabicText(mobileSearch) ? 'rtl' : 'ltr'}
                    />
                  </div>
                </form>

                {/* Nav links */}
                <nav className="flex flex-col gap-1">
                  {navLinks.map(({ href, label, icon: Icon }) => {
                    const active = location === href;
                    return (
                      <Link key={href} href={href}>
                        <button
                          className={`
                            w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 text-start
                            ${active
                              ? 'bg-primary/10 text-primary'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'}
                          `}
                        >
                          {Icon && <Icon className="w-4 h-4 shrink-0" weight={active ? 'fill' : 'regular'} />}
                          {label}
                          {active && <span className="ms-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                        </button>
                      </Link>
                    );
                  })}
                </nav>

                {/* Divider */}
                <div className="border-t border-border/30" />

                {/* Toggles */}
                <div className="flex flex-col gap-2">
                  {mounted && (
                    <button
                      onClick={() => setTheme(isDark ? 'light' : 'dark')}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    >
                      {isDark
                        ? <Sun className="w-4 h-4" weight="bold" />
                        : <Moon className="w-4 h-4" weight="bold" />
                      }
                      {isDark ? 'Light Mode' : 'Dark Mode'}
                    </button>
                  )}

                  <button
                    onClick={() => { toggleLang(); }}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  >
                    <Translate className="w-4 h-4" weight="bold" />
                    {lang === 'en' ? 'العربية' : 'English'}
                  </button>

                  {user && (
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/8 transition-colors"
                    >
                      <SignOut className="w-4 h-4" weight="bold" />
                      {t('logout')}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
