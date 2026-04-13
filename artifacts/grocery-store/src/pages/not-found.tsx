import React from 'react';
import { Link } from 'wouter';
import { useTranslation } from '@/lib/i18n';
import { Navbar } from '@/components/layout/Navbar';
import { motion } from 'framer-motion';
import { ArrowLeft } from '@phosphor-icons/react';

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-sm"
        >
          <div
            className="text-8xl font-bold mb-4 text-primary/10 select-none"
            style={{ fontFamily: 'var(--font-serif)', fontSize: '9rem', lineHeight: 1 }}
          >
            404
          </div>
          <h1
            className="text-2xl font-bold text-foreground mb-2"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {t('pageNotFound')}
          </h1>
          <p className="text-muted-foreground text-sm mb-8">{t('pageNotFoundDesc')}</p>
          <Link href="/">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Go home
            </motion.button>
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
