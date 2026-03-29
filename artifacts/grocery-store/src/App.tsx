import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { useStore } from "@/store";
import { setAuthTokenGetter } from "@workspace/api-client-react";

// Pages
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Account from "./pages/account/Account";
import AdminLogin from "./pages/admin/AdminLogin";
import Dashboard from "./pages/admin/Dashboard";
import Orders from "./pages/admin/Orders";
import Products from "./pages/admin/Products";
import Categories from "./pages/admin/Categories";
import DeliveryPersons from "./pages/admin/DeliveryPersons";
import AdminDeliveryZones from "./pages/admin/DeliveryZones";
import Admins from "./pages/admin/Admins";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } }
});

// Register auth token getter so every API call automatically includes the Bearer token
setAuthTokenGetter(() => useStore.getState().token);

function Router() {
  const lang = useStore(s => s.lang);

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/shop" component={Shop} />
      <Route path="/product/:id" component={ProductDetail} />
      <Route path="/cart" component={Cart} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/order-confirmed/:id" component={OrderConfirmation} />
      
      <Route path="/auth/login" component={Login} />
      <Route path="/auth/signup" component={Signup} />
      <Route path="/account" component={Account} />
      
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={Dashboard} />
      <Route path="/admin/orders" component={Orders} />
      <Route path="/admin/products" component={Products} />
      <Route path="/admin/categories" component={Categories} />
      <Route path="/admin/delivery" component={DeliveryPersons} />
      <Route path="/admin/delivery-zones" component={AdminDeliveryZones} />
      <Route path="/admin/admins" component={Admins} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
