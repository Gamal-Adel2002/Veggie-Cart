import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Product } from '@workspace/api-client-react';

export type Language = 'en' | 'ar';

export interface CartItem extends Product {
  cartQuantity: number;
}

interface AppState {
  // Auth
  token: string | null;
  user: User | null;
  setAuth: (token: string | null, user: User | null) => void;
  logout: () => void;
  
  // Language
  lang: Language;
  setLang: (lang: Language) => void;
  
  // Cart
  cart: CartItem[];
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      
      // Language
      lang: 'en',
      setLang: (lang) => {
        set({ lang });
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
      },
      
      // Cart
      cart: [],
      addToCart: (product, quantity) => {
        const cart = get().cart;
        const existing = cart.find(item => item.id === product.id);
        if (existing) {
          set({
            cart: cart.map(item => 
              item.id === product.id 
                ? { ...item, cartQuantity: item.cartQuantity + quantity } 
                : item
            )
          });
        } else {
          set({ cart: [...cart, { ...product, cartQuantity: quantity }] });
        }
      },
      removeFromCart: (productId) => {
        set({ cart: get().cart.filter(item => item.id !== productId) });
      },
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(productId);
          return;
        }
        set({
          cart: get().cart.map(item => 
            item.id === productId ? { ...item, cartQuantity: quantity } : item
          )
        });
      },
      clearCart: () => set({ cart: [] }),
      getCartTotal: () => get().cart.reduce((total, item) => total + (item.price * item.cartQuantity), 0),
    }),
    {
      name: 'grocery-store-storage',
    }
  )
);
