import { useStore, Language } from '@/store';

export const dictionary = {
  en: {
    home: "Home",
    shop: "Shop",
    cart: "Cart",
    account: "Account",
    admin: "Admin",
    login: "Login",
    signup: "Sign Up",
    logout: "Logout",
    startShopping: "Start Shopping",
    featuredProducts: "Featured Freshness",
    categories: "Categories",
    addToCart: "Add to Cart",
    pricePerUnit: (price: number, unit: string) => `${price} EGP / ${unit}`,
    total: "Total",
    checkout: "Proceed to Checkout",
    emptyCart: "Your cart is empty and sad.",
    estimatedDelivery: "Estimated Delivery: 30-45 minutes",
    useSavedLocation: "Use Saved Location",
    chooseNewLocation: "Choose on Map",
    confirmOrder: "Confirm Order",
    notes: "Notes for delivery",
    status: {
      waiting: "Waiting",
      accepted: "Accepted",
      rejected: "Rejected",
      preparing: "Preparing",
      with_delivery: "With Delivery",
      completed: "Completed"
    }
  },
  ar: {
    home: "الرئيسية",
    shop: "المتجر",
    cart: "السلة",
    account: "حسابي",
    admin: "لوحة التحكم",
    login: "تسجيل الدخول",
    signup: "حساب جديد",
    logout: "تسجيل الخروج",
    startShopping: "ابدأ التسوق",
    featuredProducts: "منتجات مميزة",
    categories: "التصنيفات",
    addToCart: "أضف للسلة",
    pricePerUnit: (price: number, unit: string) => `${price} ج.م / ${unit === 'kg' ? 'كجم' : unit === 'piece' ? 'قطعة' : 'حزمة'}`,
    total: "الإجمالي",
    checkout: "إتمام الطلب",
    emptyCart: "سلة التسوق فارغة.",
    estimatedDelivery: "التوصيل المتوقع: 30-45 دقيقة",
    useSavedLocation: "استخدام الموقع المحفوظ",
    chooseNewLocation: "اختر من الخريطة",
    confirmOrder: "تأكيد الطلب",
    notes: "ملاحظات للتوصيل",
    status: {
      waiting: "قيد الانتظار",
      accepted: "مقبول",
      rejected: "مرفوض",
      preparing: "قيد التجهيز",
      with_delivery: "مع المندوب",
      completed: "مكتمل"
    }
  }
};

export function useTranslation() {
  const lang = useStore(state => state.lang);
  
  function t(key: keyof typeof dictionary['en'] | string): string | any {
    const keys = key.split('.');
    let current: any = dictionary[lang];
    for (const k of keys) {
      if (current[k] === undefined) return key;
      current = current[k];
    }
    return current;
  }
  
  return { t, lang };
}
