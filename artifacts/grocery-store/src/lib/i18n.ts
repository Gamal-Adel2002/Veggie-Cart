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
    outsideDeliveryZone: "Location outside delivery area",
    outsideDeliveryZoneDesc: "Sorry, we don't deliver to your selected location. Please choose an address within our delivery zones shown on the map.",
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

    // Account / Edit Profile
    editProfile: "Edit Profile",
    saveChanges: "Save Changes",
    cancel: "Cancel",
    profileUpdated: "Profile updated!",
    profileUpdatedDesc: "Your changes have been saved successfully.",
    currentPassword: "Current Password",
    newPassword: "New Password",
    confirmNewPassword: "Confirm New Password",
    passwordsDoNotMatch: "Passwords do not match",
    leaveBlankNoChange: "Leave blank to keep current password",
    changePhoto: "Change Photo",
    updateFailed: "Update failed",

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

    // Admin — Delivery Zones
    adminDeliveryZones: "Delivery Zones",
    adminDeliveryZonesDesc: "Define areas where delivery is available. Orders outside all active zones will be rejected.",
    adminZoneAddBtn: "Add Zone",
    adminZoneCreate: "New Delivery Zone",
    adminZoneEdit: "Edit Zone",
    adminZoneName: "Zone Name",
    adminZoneRadius: "Radius (km)",
    adminZoneCenterLoc: "Center Location",
    adminZoneCenterLocHint: "(click on map, search address, or enter coordinates)",
    adminZoneActive: "Active (orders from this zone are accepted)",
    adminZoneCreateBtn: "Create Zone",
    adminZoneSaveBtn: "Save Changes",
    adminZoneCancel: "Cancel",
    adminZoneActivateBtn: "Activate",
    adminZoneDeactivateBtn: "Deactivate",
    adminZoneCreated: "Zone created successfully",
    adminZoneUpdated: "Zone updated successfully",
    adminZoneDeleted: "Zone deleted",
    adminZoneEmpty: "No delivery zones configured",
    adminZoneEmptyDesc: "Add a zone to restrict deliveries to specific areas. Without zones, all locations are accepted.",
    adminZoneLoading: "Loading zones...",
    adminZoneDeleteConfirm: (name: string) => `Delete zone "${name}"?`,
    adminZoneRadiusInfo: (km: number) => `Radius: ${km} km`,
    adminZoneFailCreate: "Failed to create zone",
    adminZoneFailUpdate: "Failed to update zone",
    adminZoneFailDelete: "Failed to delete zone",
    adminZoneFillAll: "Please fill all fields and pin a location on the map",
    adminZoneStatusActive: "Active",
    adminZoneStatusInactive: "Inactive",
    adminZoneLatLabel: "Latitude",
    adminZoneLngLabel: "Longitude",
    latLabel: "Lat",
    lngLabel: "Lng",

    // Admin — Search
    searchPlaceholder: "Search...",
    searchOrders: "Search by ID, name, phone, status...",
    searchProducts: "Search by name...",
    searchCategories: "Search by name...",
    searchDeliveryStaff: "Search by name or phone...",
    searchDeliveryZones: "Search by zone name...",
    searchCustomers: "Search by name or phone...",
    searchAdmins: "Search by name or phone...",

    // Admin — Customers
    adminCustomers: "Customers",
    adminCustomersDesc: "All registered customer accounts",
    adminCustomerEdit: "Edit Customer",
    adminCustomerName: "Name",
    adminCustomerPhone: "Phone",
    adminCustomerAddress: "Address",
    adminCustomerOrders: "Orders",
    adminCustomerJoined: "Joined",
    adminCustomerSave: "Save Changes",
    adminCustomerSaved: "Customer updated",
    adminCustomerSavedDesc: "Changes saved successfully.",
    adminCustomerSaveFail: "Failed to save customer",
    adminCustomerDelete: "Delete Customer",
    adminCustomerDeleteConfirm: (name: string) => `Delete customer "${name}"? This cannot be undone.`,
    adminCustomerDeleted: "Customer deleted",
    adminCustomerDeleteFail: "Failed to delete customer",
    adminCustomerResetPassword: "Reset Password",
    adminCustomerNewPassword: "New Password",
    adminCustomerConfirmPassword: "Confirm Password",
    adminCustomerPasswordMin: "Password must be at least 6 characters",
    adminCustomerPasswordMismatch: "Passwords do not match",
    adminCustomerPasswordReset: "Password reset successfully",
    adminCustomerPasswordResetFail: "Failed to reset password",
    adminCustomerNoResults: "No customers found",
    adminCustomerEmpty: "No customers have signed up yet.",
    adminCustomerLoading: "Loading customers...",

    // Admin — shared empty/no-match states
    adminNoMatchProducts: "No products match your search.",
    adminEmptyProducts: "No products yet.",
    adminNoMatchCategories: "No categories match your search.",
    adminEmptyCategories: "No categories yet.",
    adminNoMatchDeliveryStaff: "No staff match your search.",
    adminEmptyDeliveryStaff: "No delivery staff yet.",
    adminNoMatchDeliveryZones: "No zones match your search.",
    adminNoMatchAdmins: "No admins match your search.",
    adminEmptyAdmins: "No admins found.",

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
    outsideDeliveryZone: "الموقع خارج نطاق التوصيل",
    outsideDeliveryZoneDesc: "عذراً، لا نوصل إلى موقعك المحدد. الرجاء اختيار عنوان داخل مناطق التوصيل الموضحة على الخريطة.",
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

    // Account / Edit Profile
    editProfile: "تعديل الملف الشخصي",
    saveChanges: "حفظ التغييرات",
    cancel: "إلغاء",
    profileUpdated: "تم تحديث الملف!",
    profileUpdatedDesc: "تم حفظ تغييراتك بنجاح.",
    currentPassword: "كلمة المرور الحالية",
    newPassword: "كلمة المرور الجديدة",
    confirmNewPassword: "تأكيد كلمة المرور الجديدة",
    passwordsDoNotMatch: "كلمتا المرور غير متطابقتين",
    leaveBlankNoChange: "اتركه فارغاً للإبقاء على كلمة المرور الحالية",
    changePhoto: "تغيير الصورة",
    updateFailed: "فشل التحديث",

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

    // Admin — Delivery Zones
    adminDeliveryZones: "مناطق التوصيل",
    adminDeliveryZonesDesc: "حدد المناطق التي يُتاح فيها التوصيل. سيتم رفض الطلبات الواقعة خارج جميع المناطق النشطة.",
    adminZoneAddBtn: "إضافة منطقة",
    adminZoneCreate: "منطقة توصيل جديدة",
    adminZoneEdit: "تعديل المنطقة",
    adminZoneName: "اسم المنطقة",
    adminZoneRadius: "نطاق الدائرة (كم)",
    adminZoneCenterLoc: "موقع المركز",
    adminZoneCenterLocHint: "(اضغط على الخريطة، ابحث عن عنوان، أو أدخل الإحداثيات)",
    adminZoneActive: "نشطة (تُقبل الطلبات من هذه المنطقة)",
    adminZoneCreateBtn: "إنشاء المنطقة",
    adminZoneSaveBtn: "حفظ التغييرات",
    adminZoneCancel: "إلغاء",
    adminZoneActivateBtn: "تفعيل",
    adminZoneDeactivateBtn: "إيقاف",
    adminZoneCreated: "تم إنشاء المنطقة بنجاح",
    adminZoneUpdated: "تم تحديث المنطقة بنجاح",
    adminZoneDeleted: "تم حذف المنطقة",
    adminZoneEmpty: "لا توجد مناطق توصيل",
    adminZoneEmptyDesc: "أضف منطقة لتقييد التوصيل بمناطق معينة. بدون مناطق، تُقبل جميع المواقع.",
    adminZoneLoading: "جاري تحميل المناطق...",
    adminZoneDeleteConfirm: (name: string) => `حذف المنطقة "${name}"؟`,
    adminZoneRadiusInfo: (km: number) => `النطاق: ${km} كم`,
    adminZoneFailCreate: "فشل إنشاء المنطقة",
    adminZoneFailUpdate: "فشل تحديث المنطقة",
    adminZoneFailDelete: "فشل حذف المنطقة",
    adminZoneFillAll: "يرجى ملء جميع الحقول وتحديد موقع على الخريطة",
    adminZoneStatusActive: "نشطة",
    adminZoneStatusInactive: "غير نشطة",
    adminZoneLatLabel: "خط العرض",
    adminZoneLngLabel: "خط الطول",
    latLabel: "خ.ع",
    lngLabel: "خ.ط",

    // Admin — Search
    searchPlaceholder: "بحث...",
    searchOrders: "بحث برقم الطلب أو الاسم أو الهاتف أو الحالة...",
    searchProducts: "بحث بالاسم...",
    searchCategories: "بحث بالاسم...",
    searchDeliveryStaff: "بحث بالاسم أو الهاتف...",
    searchDeliveryZones: "بحث باسم المنطقة...",
    searchCustomers: "بحث بالاسم أو الهاتف...",
    searchAdmins: "بحث بالاسم أو الهاتف...",

    // Admin — Customers
    adminCustomers: "العملاء",
    adminCustomersDesc: "جميع حسابات العملاء المسجلين",
    adminCustomerEdit: "تعديل العميل",
    adminCustomerName: "الاسم",
    adminCustomerPhone: "الهاتف",
    adminCustomerAddress: "العنوان",
    adminCustomerOrders: "الطلبات",
    adminCustomerJoined: "تاريخ الانضمام",
    adminCustomerSave: "حفظ التغييرات",
    adminCustomerSaved: "تم تحديث العميل",
    adminCustomerSavedDesc: "تم حفظ التغييرات بنجاح.",
    adminCustomerSaveFail: "فشل حفظ بيانات العميل",
    adminCustomerDelete: "حذف العميل",
    adminCustomerDeleteConfirm: (name: string) => `حذف العميل "${name}"؟ لا يمكن التراجع عن هذا.`,
    adminCustomerDeleted: "تم حذف العميل",
    adminCustomerDeleteFail: "فشل حذف العميل",
    adminCustomerResetPassword: "إعادة تعيين كلمة المرور",
    adminCustomerNewPassword: "كلمة المرور الجديدة",
    adminCustomerConfirmPassword: "تأكيد كلمة المرور",
    adminCustomerPasswordMin: "يجب أن تكون كلمة المرور 6 أحرف على الأقل",
    adminCustomerPasswordMismatch: "كلمتا المرور غير متطابقتين",
    adminCustomerPasswordReset: "تم إعادة تعيين كلمة المرور بنجاح",
    adminCustomerPasswordResetFail: "فشل إعادة تعيين كلمة المرور",
    adminCustomerNoResults: "لا يوجد عملاء مطابقون",
    adminCustomerEmpty: "لم يشترك أي عميل بعد.",
    adminCustomerLoading: "جاري تحميل العملاء...",

    // Admin — shared empty/no-match states
    adminNoMatchProducts: "لا توجد منتجات تطابق بحثك.",
    adminEmptyProducts: "لا توجد منتجات بعد.",
    adminNoMatchCategories: "لا توجد فئات تطابق بحثك.",
    adminEmptyCategories: "لا توجد فئات بعد.",
    adminNoMatchDeliveryStaff: "لا يوجد موظفون يطابقون بحثك.",
    adminEmptyDeliveryStaff: "لا يوجد موظفو توصيل بعد.",
    adminNoMatchDeliveryZones: "لا توجد مناطق تطابق بحثك.",
    adminNoMatchAdmins: "لا يوجد مشرفون يطابقون بحثك.",
    adminEmptyAdmins: "لا يوجد مشرفون.",

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
