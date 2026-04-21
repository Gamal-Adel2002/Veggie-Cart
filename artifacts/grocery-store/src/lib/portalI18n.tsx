import React, { createContext, useContext, useState, useCallback } from 'react';
import { dictionary } from './i18n';

type Lang = 'en' | 'ar';

function resolveDotted(obj: any, key: string): any {
  const parts = key.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

interface PortalLangCtxValue {
  lang: Lang;
  setLang: (l: Lang) => void;
}

function createPortalI18n(storageKey: string) {
  const Ctx = createContext<PortalLangCtxValue>({ lang: 'en', setLang: () => {} });

  function Provider({ children }: { children: React.ReactNode }) {
    const [lang, setLangState] = useState<Lang>(() => {
      try {
        const v = localStorage.getItem(storageKey);
        return v === 'ar' ? 'ar' : 'en';
      } catch {
        return 'en';
      }
    });

    const setLang = useCallback((l: Lang) => {
      setLangState(l);
      try { localStorage.setItem(storageKey, l); } catch {}
    }, []);

    return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>;
  }

  function usePortalTranslation() {
    const { lang, setLang } = useContext(Ctx);

    function t(key: string): any {
      const val = resolveDotted(dictionary[lang], key);
      if (val !== undefined) return val;
      const fallback = resolveDotted(dictionary['en'], key);
      return fallback !== undefined ? fallback : key;
    }

    const dir: 'rtl' | 'ltr' = lang === 'ar' ? 'rtl' : 'ltr';
    return { t, lang, setLang, dir, isRTL: lang === 'ar' };
  }

  return { Provider, usePortalTranslation };
}

const { Provider: AdminLangProvider, usePortalTranslation: useAdminTranslation } = createPortalI18n('admin_lang');
const { Provider: DeliveryLangProvider, usePortalTranslation: useDeliveryTranslation } = createPortalI18n('delivery_lang');

export { AdminLangProvider, useAdminTranslation, DeliveryLangProvider, useDeliveryTranslation };
