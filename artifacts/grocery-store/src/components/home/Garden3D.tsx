import React from 'react';
import { useTranslation } from '@/lib/i18n';
import { Link } from 'wouter';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { ShoppingBag, ArrowRight } from '@phosphor-icons/react';
import { useRef } from 'react';

const floatItems = [
  { emoji: '🥑', x: '72%', y: '15%', size: 'text-7xl', delay: 0 },
  { emoji: '🍅', x: '82%', y: '50%', size: 'text-6xl', delay: 1.2 },
  { emoji: '🥦', x: '60%', y: '70%', size: 'text-5xl', delay: 0.6 },
  { emoji: '🥕', x: '88%', y: '28%', size: 'text-5xl', delay: 1.8 },
  { emoji: '🌽', x: '66%', y: '38%', size: 'text-4xl', delay: 0.9 },
  { emoji: '🍋', x: '76%', y: '80%', size: 'text-4xl', delay: 2.1 },
];

export default function Garden3D() {
  const { t, lang } = useTranslation();
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollY } = useScroll();

  const bgY = useTransform(scrollY, [0, 600], ['0%', '22%']);
  const bgScale = useTransform(scrollY, [0, 600], [1.08, 1.18]);
  const bgOpacity = useTransform(scrollY, [0, 400], [1, 0.65]);
  const midY = useTransform(scrollY, [0, 600], ['0%', '-14%']);
  const fgY = useTransform(scrollY, [0, 600], ['0%', '-8%']);
  const fgOpacity = useTransform(scrollY, [0, 300], [1, 0.6]);

  const smoothMidY = useSpring(midY, { stiffness: 80, damping: 24 });
  const smoothFgY = useSpring(fgY, { stiffness: 60, damping: 20 });

  return (
    <div ref={sectionRef} className="absolute inset-0 overflow-hidden">
      {/* Layer 1 — Background: dark gradient panorama with CSS 3D depth */}
      <motion.div
        className="absolute inset-0 hero-animated-bg"
        style={{ y: bgY, scale: bgScale, opacity: bgOpacity, transformOrigin: 'center center' }}
      />

      {/* Layer 1b — Depth overlay gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, rgba(10,30,20,0.72) 0%, rgba(10,30,20,0.40) 55%, rgba(10,30,20,0.15) 100%)',
        }}
      />

      {/* Subtle perspective grid for depth illusion */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 70% 60%, rgba(201, 151, 74, 0.08) 0%, transparent 55%)`,
        }}
      />

      {/* Layer 2 — Mid: floating produce (medium parallax) */}
      <motion.div
        className="absolute inset-0 pointer-events-none select-none"
        style={{ y: smoothMidY }}
      >
        {floatItems.map((item, i) => (
          <motion.span
            key={i}
            className={`absolute ${item.size} opacity-25`}
            style={{ left: item.x, top: item.y }}
            animate={{
              y: [0, -16, 0],
              rotate: [0, 6, -4, 0],
            }}
            transition={{
              duration: 5 + i * 0.7,
              delay: item.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {item.emoji}
          </motion.span>
        ))}

        {/* Glowing orbs */}
        <motion.div
          className="absolute w-64 h-64 rounded-full"
          style={{
            top: '-5%', right: '8%',
            background: 'radial-gradient(circle, rgba(201,151,74,0.12) 0%, transparent 70%)',
            filter: 'blur(32px)',
          }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-96 h-96 rounded-full"
          style={{
            bottom: '10%', right: '25%',
            background: 'radial-gradient(circle, rgba(26,104,64,0.18) 0%, transparent 70%)',
            filter: 'blur(48px)',
          }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
      </motion.div>

      {/* Layer 3 — Foreground: headline content (slowest parallax) */}
      <motion.div
        className="absolute inset-0 flex items-center"
        style={{ y: smoothFgY, opacity: fgOpacity }}
      >
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="mb-6"
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm text-white/90 text-xs font-semibold tracking-widest uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                {lang === 'en' ? 'Premium Grocery Delivery' : 'توصيل بقالة فاخر'}
              </span>
            </motion.div>

            {/* Headline — Playfair Display for premium feel */}
            <motion.h1
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold leading-[1.02] text-white drop-shadow-2xl mb-6 max-w-2xl"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              {lang === 'en' ? (
                <>
                  Order Your{' '}
                  <span
                    className="relative inline-block"
                    style={{ color: 'hsl(36 63% 72%)' }}
                  >
                    Grocery
                  </span>
                  {' '}From Home
                </>
              ) : (
                <>
                  اطلب{' '}
                  <span style={{ color: 'hsl(36 63% 72%)' }}>بقالتك</span>
                  {' '}من البيت
                </>
              )}
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="text-white/65 text-lg leading-relaxed mb-10 max-w-xl"
            >
              {lang === 'en'
                ? 'Fresh vegetables, organic fruits & herbs — curated and delivered to your door in under 2 hours.'
                : 'خضروات طازجة، فواكه عضوية وأعشاب — مختارة بعناية وموصلة لبابك في أقل من ساعتين.'}
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-wrap items-center gap-4"
            >
              <Link href="/shop">
                <motion.button
                  whileHover={{ scale: 1.04, boxShadow: '0 8px 32px rgba(201,151,74,0.45)' }}
                  whileTap={{ scale: 0.97 }}
                  className="relative overflow-hidden inline-flex items-center gap-2.5 px-8 h-14 rounded-lg font-semibold text-base transition-all duration-200 pointer-events-auto btn-gold-shimmer"
                  style={{
                    background: 'hsl(36 63% 55%)',
                    color: '#fff',
                    boxShadow: '0 4px 20px rgba(201,151,74,0.30)',
                  }}
                >
                  <ShoppingBag className="w-5 h-5" weight="fill" />
                  {t('shop')}
                  <ArrowRight className={`w-4 h-4 ${lang === 'ar' ? 'rotate-180' : ''}`} weight="bold" />
                </motion.button>
              </Link>
              <Link href="/shop">
                <motion.button
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.15)' }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 px-8 h-14 rounded-lg font-semibold text-base text-white border border-white/30 backdrop-blur-sm transition-all duration-200 pointer-events-auto"
                >
                  {t('viewAll')}
                </motion.button>
              </Link>
            </motion.div>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-wrap items-center gap-8 mt-12 pt-10 border-t border-white/10"
            >
              {[
                { value: '100%', label: lang === 'en' ? 'Organic' : 'عضوي' },
                { value: '2h', label: lang === 'en' ? 'Fast Delivery' : 'توصيل سريع' },
                { value: '10K+', label: lang === 'en' ? 'Happy Customers' : 'عميل سعيد' },
              ].map((stat, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="text-xl font-bold text-white"
                    style={{ fontFamily: 'var(--font-serif)' }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-sm text-white/50 font-medium">{stat.label}</div>
                  {i < 2 && <div className="w-px h-6 bg-white/15" />}
                </div>
              ))}
            </motion.div>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
