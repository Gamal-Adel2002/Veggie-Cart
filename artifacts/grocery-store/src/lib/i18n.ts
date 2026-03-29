import { useStore, Language } from '@/store';

export const dictionary = {
  en: {
    // Nav
    home: "Home",
    shop: "Shop",
    cart: "Cart",
    account: "Account",
    admin: "Admin",
    login: "Login",
    signup: "Sign Up",
    logout: "Logout",

    // Hero
    farmFreshDaily: "Farm Fresh Daily",
    heroTitle1: "Fresh Greens,",
    heroTitle2: "Delivered",
    heroSubtitle: "Skip the lines. Get farm-fresh vegetables and fruits delivered straight to your door in 45 minutes or less.",
    viewAll: "View All",

    // Categories / Products
    startShopping: "Start Shopping",
    featuredProducts: "Featured Freshness",
    categories: "Categories",
    allProducts: "All Products",
    items: "items",
    addToCart: "Add to Cart",
    outOfStock: "Out of Stock",
    featured: "Featured",
    noProductsFound: "No products found",
    adjustFilters: "Try adjusting your filters",
    searchVegetables: "Search vegetables...",
    back: "Back",
    noImage: "No Image",
    freshDefault: "Fresh and locally sourced. Perfect for your daily cooking needs.",
    addedToCart: "Added to Cart",
    addedToCartDesc: (qty: number, name: string) => `${qty} × ${name} added.`,
    productNotFound: "Product not found",

    // Unit labels
    unitLabel: (unit: string) => unit,

    // Price
    pricePerUnit: (price: number, unit: string) => `${price} EGP / ${unit}`,

    // Cart
    total: "Total",
    checkout: "Proceed to Checkout",
    emptyCart: "Your cart is empty and sad.",
    remove: "Remove",
    orderSummary: "Order Summary",
    subtotal: "Subtotal",
    delivery: "Delivery",
    free: "Free",

    // Checkout
    checkoutTitle: "Checkout",
    contactInfo: "Contact Info",
    fullName: "Full Name",
    phoneNumber: "Phone Number",
    deliveryLocation: "Delivery Location",
    deliveryNotes: "Delivery Notes (Optional)",
    deliveryNotesPlaceholder: "e.g. Call upon arrival...",
    useSavedLocation: "Use Saved Location",
    chooseNewLocation: "Choose New",
    savedAddress: "Saved Address",
    locationPinned: "Location pinned",
    paymentCash: "Payment: Cash on Delivery",
    confirmOrder: "Confirm Order",
    estimatedDelivery: "Estimated Delivery: 30-45 minutes",
    deliveryTime: "30-45 mins",
    chooseOnMap: "Choose on Map",
    selectLocationError: "Please select a delivery location.",
    orderPlacedError: "Failed to place order",

    // Order Confirmation
    orderConfirmed: "Order Confirmed!",
    orderConfirmedDesc: (name: string) => `Thank you, ${name}. Your fresh veggies are being prepared.`,
    orderId: "Order ID",
    deliveryTo: "Delivery to",
    totalPaidCash: "Total Paid (Cash)",
    trackOrder: "Track Order Status",
    continueShopping: "Continue Shopping",
    orderNotFound: "Order not found",

    // Validation errors
    validPhoneRequired: "Valid phone required",
    passwordRequired: "Password required",
    nameRequired: "Name required",
    passwordMinLength: "Password must be at least 6 characters",

    // Auth - Login
    welcomeBack: "Welcome Back",
    loginSubtitle: "Log in to track your orders and checkout faster.",
    password: "Password",
    logIn: "Log In",
    noAccount: "Don't have an account?",
    loginFailed: "Login failed",
    invalidCredentials: "Invalid credentials",

    // Auth - Signup
    createAccount: "Create Account",
    name: "Name",
    phone: "Phone",
    deliveryLocationLabel: "Delivery Location",
    apartmentDetails: "Apartment / Floor Details (Optional)",
    signUp: "Sign Up",
    signupFailed: "Signup failed",
    errorCreatingAccount: "Error creating account",
    alreadyHaveAccount: "Already have an account?",

    // Account
    savedLocation: "Saved Location",
    orderHistory: "Order History",
    loadingOrders: "Loading orders...",
    noOrdersYet: "You haven't placed any orders yet.",
    order: "Order",
    pleaseLogin: "Please log in.",

    // Order status
    status: {
      waiting: "Waiting",
      accepted: "Accepted",
      rejected: "Rejected",
      preparing: "Preparing",
      with_delivery: "With Delivery",
      completed: "Completed"
    },

    // Not found
    pageNotFound: "404 Page Not Found",
    pageNotFoundDesc: "The page you are looking for does not exist.",
  },
  ar: {
    // Nav
    home: "الرئيسية",
    shop: "المتجر",
    cart: "السلة",
    account: "حسابي",
    admin: "لوحة التحكم",
    login: "تسجيل الدخول",
    signup: "حساب جديد",
    logout: "تسجيل الخروج",

    // Hero
    farmFreshDaily: "طازج من المزرعة يومياً",
    heroTitle1: "خضار طازجة،",
    heroTitle2: "توصيل لبابك",
    heroSubtitle: "تجنب الانتظار. احصل على خضار وفواكه طازجة توصل إلى بابك في 45 دقيقة أو أقل.",
    viewAll: "عرض الكل",

    // Categories / Products
    startShopping: "ابدأ التسوق",
    featuredProducts: "منتجات مميزة",
    categories: "التصنيفات",
    allProducts: "جميع المنتجات",
    items: "منتج",
    addToCart: "أضف للسلة",
    outOfStock: "غير متوفر",
    featured: "مميز",
    noProductsFound: "لا توجد منتجات",
    adjustFilters: "حاول تغيير الفلاتر",
    searchVegetables: "ابحث عن خضار...",
    back: "رجوع",
    noImage: "لا توجد صورة",
    freshDefault: "طازج ومحلي. مثالي لاحتياجاتك اليومية في الطهي.",
    addedToCart: "تمت الإضافة للسلة",
    addedToCartDesc: (qty: number, name: string) => `تمت إضافة ${qty} × ${name}.`,
    productNotFound: "المنتج غير موجود",

    // Unit labels
    unitLabel: (unit: string) => unit === 'kg' ? 'كجم' : unit === 'piece' ? 'قطعة' : unit === 'bundle' ? 'حزمة' : unit,

    // Price
    pricePerUnit: (price: number, unit: string) => {
      const unitAr = unit === 'kg' ? 'كجم' : unit === 'piece' ? 'قطعة' : unit === 'bundle' ? 'حزمة' : unit;
      return `${price} ج.م / ${unitAr}`;
    },

    // Cart
    total: "الإجمالي",
    checkout: "إتمام الطلب",
    emptyCart: "سلة التسوق فارغة.",
    remove: "إزالة",
    orderSummary: "ملخص الطلب",
    subtotal: "المجموع الفرعي",
    delivery: "التوصيل",
    free: "مجاني",

    // Checkout
    checkoutTitle: "إتمام الطلب",
    contactInfo: "بيانات التواصل",
    fullName: "الاسم الكامل",
    phoneNumber: "رقم الهاتف",
    deliveryLocation: "موقع التوصيل",
    deliveryNotes: "ملاحظات التوصيل (اختياري)",
    deliveryNotesPlaceholder: "مثال: اتصل عند الوصول...",
    useSavedLocation: "استخدام الموقع المحفوظ",
    chooseNewLocation: "اختر موقعاً جديداً",
    savedAddress: "العنوان المحفوظ",
    locationPinned: "تم تثبيت الموقع",
    paymentCash: "الدفع: نقداً عند الاستلام",
    confirmOrder: "تأكيد الطلب",
    estimatedDelivery: "التوصيل المتوقع: 30-45 دقيقة",
    deliveryTime: "30-45 دقيقة",
    chooseOnMap: "اختر من الخريطة",
    selectLocationError: "يرجى تحديد موقع التوصيل.",
    orderPlacedError: "فشل تقديم الطلب",

    // Order Confirmation
    orderConfirmed: "تم تأكيد الطلب!",
    orderConfirmedDesc: (name: string) => `شكراً لك، ${name}. جاري تجهيز طلبك.`,
    orderId: "رقم الطلب",
    deliveryTo: "التوصيل إلى",
    totalPaidCash: "إجمالي المدفوع (نقداً)",
    trackOrder: "تتبع حالة الطلب",
    continueShopping: "مواصلة التسوق",
    orderNotFound: "الطلب غير موجود",

    // Validation errors
    validPhoneRequired: "رقم الهاتف غير صحيح",
    passwordRequired: "كلمة المرور مطلوبة",
    nameRequired: "الاسم مطلوب",
    passwordMinLength: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",

    // Auth - Login
    welcomeBack: "مرحباً بعودتك",
    loginSubtitle: "سجل دخولك لمتابعة طلباتك والدفع بشكل أسرع.",
    password: "كلمة المرور",
    logIn: "تسجيل الدخول",
    noAccount: "ليس لديك حساب؟",
    loginFailed: "فشل تسجيل الدخول",
    invalidCredentials: "بيانات خاطئة",

    // Auth - Signup
    createAccount: "إنشاء حساب",
    name: "الاسم",
    phone: "الهاتف",
    deliveryLocationLabel: "موقع التوصيل",
    apartmentDetails: "تفاصيل الشقة / الدور (اختياري)",
    signUp: "إنشاء حساب",
    signupFailed: "فشل إنشاء الحساب",
    errorCreatingAccount: "حدث خطأ أثناء إنشاء الحساب",
    alreadyHaveAccount: "لديك حساب بالفعل؟",

    // Account
    savedLocation: "الموقع المحفوظ",
    orderHistory: "سجل الطلبات",
    loadingOrders: "جاري تحميل الطلبات...",
    noOrdersYet: "لم تقم بأي طلبات بعد.",
    order: "طلب",
    pleaseLogin: "يرجى تسجيل الدخول.",

    // Order status
    status: {
      waiting: "قيد الانتظار",
      accepted: "مقبول",
      rejected: "مرفوض",
      preparing: "قيد التجهيز",
      with_delivery: "مع المندوب",
      completed: "مكتمل"
    },

    // Not found
    pageNotFound: "404 الصفحة غير موجودة",
    pageNotFoundDesc: "الصفحة التي تبحث عنها غير موجودة.",
  }
};

function resolveDotted(obj: any, key: string): any {
  const keys = key.split('.');
  let current = obj;
  for (const k of keys) {
    if (current === undefined || current === null) return undefined;
    current = current[k];
  }
  return current;
}

export function useTranslation() {
  const lang = useStore(state => state.lang);

  function t(key: string): any {
    const val = resolveDotted(dictionary[lang], key);
    if (val !== undefined) return val;
    const fallback = resolveDotted(dictionary['en'], key);
    return fallback !== undefined ? fallback : key;
  }

  return { t, lang };
}
