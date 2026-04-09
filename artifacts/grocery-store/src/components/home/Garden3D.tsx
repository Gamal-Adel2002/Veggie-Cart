import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Leaf, Truck, Users } from 'lucide-react';
import { motion } from 'framer-motion';

const images = [
  `${import.meta.env.BASE_URL}images/hero-grocery-basket.jpg`,
  `${import.meta.env.BASE_URL}images/hero-bg.png`,
];

export default function Garden3D() {
  const { t, lang } = useTranslation();
  const heroRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [activeImg, setActiveImg] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveImg(prev => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (loaded) {
      setLoaded(true);
    }
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Background images - Ken Burns effect + crossfade */}
      {images.map((img, i) => (
        <div
          key={i}
          ref={i === 0 ? heroRef : undefined}
          className={`absolute inset-0 transition-opacity duration-[2000ms] ${i === activeImg ? 'opacity-100' : 'opacity-0'}`}
        >
          <img
            src={img}
            alt=""
            className={`w-full h-full object-cover ${i === activeImg ? 'animate-kenburns' : ''}`}
            draggable={false}
          />
        </div>
      ))}

      {/* Gradient overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

      {/* Floating particles overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-green-400/30 rounded-full animate-float-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 6}s`,
              animationDuration: `${4 + Math.random() * 6}s`,
            }}
          />
        ))}
      </div>

      {/* Centered content */}
      <div className="absolute inset-0 flex items-center">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Badge */}
            <motion.div
              className="animate-fade-slide-right"
              style={{ animationDelay: '300ms' }}
            >
              <span className="inline-flex items-center gap-2 bg-green-500/15 backdrop-blur-lg border border-green-400/25 text-green-100 px-5 py-2 rounded-full text-xs font-bold tracking-widest uppercase">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse-soft" />
                {lang === 'en' ? 'From Our Garden to Your Door' : 'من حديقتنا إلى بابك'}
              </span>
            </motion.div>

            {/* Title */}
            <h1 className="animate-fade-slide-right text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-display font-extrabold leading-tight text-white drop-shadow-2xl mt-5" style={{ animationDelay: '500ms' }}>
              {lang === 'en' ? (
                <>Order Your <span className="text-green-300">Grocery</span> From Home</>
              ) : (
                <>اطلب <span className="text-green-300">بقالتك</span> من البيت</>
              )}
            </h1>

            {/* Subtitle */}
            <p className="animate-fade-slide-right text-lg text-white/70 mt-5 leading-relaxed max-w-lg" style={{ animationDelay: '700ms' }}>
              {lang === 'en'
                ? 'Fresh vegetables, organic fruits & herbs — grown in real gardens, delivered to your doorstep.'
                : 'خضروات طازجة، فواكه عضوية وأعشاب — مزروعة في حدائق حقيقية، موصلة إلى باب منزلك.'}
            </p>

            {/* CTAs */}
            <div className="animate-fade-slide-right flex flex-wrap items-center gap-4 mt-8" style={{ animationDelay: '900ms' }}>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
                <Link href="/shop">
                  <Button className="btn-shine h-14 px-8 rounded-2xl text-base font-bold bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white border-0 shadow-brand pointer-events-auto">
                    <ShoppingBag className="w-5 h-5 me-2" />
                    {t('shop')}
                  </Button>
                </Link>
              </motion.div>
            </div>

            {/* Stats row */}
            <div className="animate-fade-slide-right flex flex-wrap items-center gap-8 mt-10 pt-8 border-t border-white/10" style={{ animationDelay: '1100ms' }}>
              {[
                { icon: Leaf, value: '100%', label: lang === 'en' ? 'Organic' : 'عضوي' },
                { icon: Truck, value: '2h', label: lang === 'en' ? 'Fast Delivery' : 'توصيل سريع' },
                { icon: Users, value: '10K+', label: lang === 'en' ? 'Happy Customers' : 'عميل سعيد' },
              ].map((stat, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="bg-green-500/15 backdrop-blur-md p-2.5 rounded-xl border border-green-400/20">
                    <stat.icon className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <div className="text-xl font-bold text-white">{stat.value}</div>
                    <div className="text-xs text-white/50">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}