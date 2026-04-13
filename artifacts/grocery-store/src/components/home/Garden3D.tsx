import React from 'react';
import { useTranslation } from '@/lib/i18n';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { ShoppingBag, ArrowRight } from '@phosphor-icons/react';

export default function Garden3D() {
  const { t, lang } = useTranslation();
  const isRtl = lang === 'ar';

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Vegetables photo background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("${import.meta.env.BASE_URL}images/hero-bg-vegetables.png")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Dark overlay for text readability */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(105deg, rgba(15,10,5,0.78) 0%, rgba(15,10,5,0.60) 50%, rgba(15,10,5,0.30) 100%)',
        }}
      />

      {/* ── Main content grid ── */}
      <div className="absolute inset-0 flex items-center">
        <div className="w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className={`flex items-center justify-between gap-8 ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>

            {/* Left — Text content */}
            <div className={`flex-1 min-w-0 ${isRtl ? 'text-right' : 'text-left'}`}>

              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="mb-5"
              >
                <span
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase"
                  style={{
                    background: 'rgba(201,151,74,0.18)',
                    border: '1px solid rgba(201,151,74,0.35)',
                    color: 'hsl(36 63% 72%)',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  {isRtl ? 'توصيل خضار فاخر' : 'Premium Vegetable Delivery'}
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="font-bold leading-[1.05] text-white drop-shadow-xl mb-5"
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(2.4rem, 5vw, 4.2rem)',
                }}
              >
                {isRtl ? (
                  <>
                    اطلب{' '}
                    <span style={{ color: 'hsl(36 63% 72%)' }}>خضارك</span>
                    {' '}من البيت
                  </>
                ) : (
                  <>
                    Order Your{' '}
                    <span style={{ color: 'hsl(36 63% 72%)' }}>Vegetables</span>
                  </>
                )}
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.38, ease: [0.22, 1, 0.36, 1] }}
                className="mb-8 leading-relaxed max-w-md"
                style={{ color: 'rgba(255,255,255,0.62)', fontSize: '1.05rem' }}
              >
                {isRtl
                  ? 'خضروات طازجة وفواكه عضوية — مختارة بعناية وموصلة لبابك في أقل من ساعتين.'
                  : 'Fresh vegetables, organic fruits & herbs — curated and delivered to your door in under 2 hours.'}
              </motion.p>

              {/* CTA row */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className={`flex flex-wrap gap-3 ${isRtl ? 'flex-row-reverse justify-end' : ''}`}
              >
                <Link href="/shop">
                  <motion.button
                    whileHover={{ scale: 1.04, boxShadow: '0 8px 32px rgba(201,151,74,0.50)' }}
                    whileTap={{ scale: 0.97 }}
                    className="relative overflow-hidden inline-flex items-center gap-2.5 px-8 h-13 rounded-lg font-semibold text-base transition-all duration-200 btn-gold-shimmer"
                    style={{
                      height: '52px',
                      background: 'hsl(36 63% 55%)',
                      color: '#fff',
                      boxShadow: '0 4px 20px rgba(201,151,74,0.35)',
                    }}
                  >
                    <ShoppingBag className="w-5 h-5" weight="fill" />
                    {t('shop')}
                    <ArrowRight
                      className="w-4 h-4"
                      weight="bold"
                      style={{ transform: isRtl ? 'rotate(180deg)' : 'none' }}
                    />
                  </motion.button>
                </Link>
                <Link href="/shop">
                  <motion.button
                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.12)' }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center gap-2 px-8 rounded-lg font-semibold text-base text-white border border-white/25 backdrop-blur-sm transition-all duration-200"
                    style={{ height: '52px' }}
                  >
                    {t('viewAll')}
                  </motion.button>
                </Link>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.68, ease: [0.22, 1, 0.36, 1] }}
                className={`flex flex-wrap items-center gap-6 mt-10 pt-8 border-t border-white/10 ${isRtl ? 'flex-row-reverse' : ''}`}
              >
                {[
                  { value: '100%', label: isRtl ? 'عضوي' : 'Organic' },
                  { value: '2h', label: isRtl ? 'توصيل سريع' : 'Fast Delivery' },
                  { value: '10K+', label: isRtl ? 'عميل سعيد' : 'Happy Customers' },
                ].map((stat, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-serif)' }}>
                      {stat.value}
                    </div>
                    <div className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.48)' }}>
                      {stat.label}
                    </div>
                    {i < 2 && <div className="w-px h-5 bg-white/12" />}
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right — Delivery man image */}
            <motion.div
              initial={{ opacity: 0, x: isRtl ? -40 : 40, scale: 0.94 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.85, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:flex shrink-0 items-end justify-center relative"
              style={{ width: '420px', height: '420px' }}
            >
              {/* Circle crop */}
              <div
                className="relative w-full h-full rounded-full overflow-hidden"
                style={{
                  border: '3px solid rgba(255,255,255,0.30)',
                  boxShadow: '0 0 0 8px rgba(255,255,255,0.07), 0 24px 60px rgba(0,0,0,0.45)',
                  background: '#ffffff',
                }}
              >
                <img
                  src={`${import.meta.env.BASE_URL}images/hero-delivery-man.png`}
                  alt="Delivery man with fresh groceries"
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}
