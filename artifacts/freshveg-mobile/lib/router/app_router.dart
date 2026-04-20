import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_provider.dart';
import '../screens/splash_screen.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/signup_screen.dart';
import '../screens/auth/role_select_screen.dart';
import '../screens/customer/customer_shell.dart';
import '../screens/customer/home_screen.dart';
import '../screens/customer/shop_screen.dart';
import '../screens/customer/product_detail_screen.dart';
import '../screens/customer/cart_screen.dart';
import '../screens/customer/checkout_screen.dart';
import '../screens/customer/order_confirmation_screen.dart';
import '../screens/customer/account_screen.dart';
import '../screens/customer/feed_screen.dart';
import '../screens/customer/messages_screen.dart';
import '../screens/admin/admin_shell.dart';
import '../screens/admin/admin_login_screen.dart';
import '../screens/admin/dashboard_screen.dart';
import '../screens/admin/orders_screen.dart';
import '../screens/admin/products_screen.dart';
import '../screens/admin/categories_screen.dart';
import '../screens/admin/delivery_zones_screen.dart';
import '../screens/admin/store_hours_screen.dart';
import '../screens/admin/promo_codes_screen.dart';
import '../screens/admin/vouchers_screen.dart';
import '../screens/admin/customers_screen.dart';
import '../screens/admin/staff_screen.dart';
import '../screens/admin/suppliers_screen.dart';
import '../screens/admin/supplier_orders_screen.dart';
import '../screens/admin/public_chat_screen.dart';
import '../screens/admin/private_chats_screen.dart';
import '../screens/delivery/delivery_login_screen.dart';
import '../screens/delivery/delivery_dashboard_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);
  return GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) {
      final isLoading = authState.isLoading;
      final isLoggedIn = authState.isLoggedIn;
      final role = authState.role;
      final path = state.uri.path;

      if (isLoading) return '/splash';

      const publicPaths = [
        '/splash', '/login', '/signup', '/role-select',
        '/admin-login', '/delivery-login',
      ];
      final isPublic = publicPaths.any((p) => path == p || path.startsWith(p));

      if (!isLoggedIn && !isPublic) return '/role-select';

      if (isLoggedIn) {
        if (isPublic && path != '/splash') {
          if (role == 'admin') return '/admin';
          if (role == 'delivery') return '/delivery';
          return '/home';
        }
      }
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/role-select', builder: (_, __) => const RoleSelectScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/signup', builder: (_, __) => const SignupScreen()),
      GoRoute(path: '/admin-login', builder: (_, __) => const AdminLoginScreen()),
      GoRoute(path: '/delivery-login', builder: (_, __) => const DeliveryLoginScreen()),

      ShellRoute(
        builder: (context, state, child) => CustomerShell(child: child),
        routes: [
          GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
          GoRoute(path: '/shop', builder: (_, __) => const ShopScreen()),
          GoRoute(
            path: '/product/:id',
            builder: (_, state) =>
                ProductDetailScreen(id: int.parse(state.pathParameters['id']!)),
          ),
          GoRoute(path: '/cart', builder: (_, __) => const CartScreen()),
          GoRoute(path: '/checkout', builder: (_, __) => const CheckoutScreen()),
          GoRoute(
            path: '/order-confirmation/:id',
            builder: (_, state) => OrderConfirmationScreen(
                orderId: int.parse(state.pathParameters['id']!)),
          ),
          GoRoute(path: '/account', builder: (_, __) => const AccountScreen()),
          GoRoute(path: '/feed', builder: (_, __) => const FeedScreen()),
          GoRoute(path: '/messages', builder: (_, __) => const MessagesScreen()),
        ],
      ),

      ShellRoute(
        builder: (context, state, child) => AdminShell(child: child),
        routes: [
          GoRoute(path: '/admin', builder: (_, __) => const DashboardScreen()),
          GoRoute(path: '/admin/orders', builder: (_, __) => const AdminOrdersScreen()),
          GoRoute(path: '/admin/products', builder: (_, __) => const AdminProductsScreen()),
          GoRoute(path: '/admin/categories', builder: (_, __) => const AdminCategoriesScreen()),
          GoRoute(path: '/admin/delivery-zones', builder: (_, __) => const DeliveryZonesScreen()),
          GoRoute(path: '/admin/store-hours', builder: (_, __) => const StoreHoursScreen()),
          GoRoute(path: '/admin/promo-codes', builder: (_, __) => const PromoCodesScreen()),
          GoRoute(path: '/admin/vouchers', builder: (_, __) => const VouchersScreen()),
          GoRoute(path: '/admin/customers', builder: (_, __) => const AdminCustomersScreen()),
          GoRoute(path: '/admin/staff', builder: (_, __) => const StaffScreen()),
          GoRoute(path: '/admin/suppliers', builder: (_, __) => const SuppliersScreen()),
          GoRoute(path: '/admin/supplier-orders', builder: (_, __) => const SupplierOrdersScreen()),
          GoRoute(path: '/admin/public-chat', builder: (_, __) => const AdminPublicChatScreen()),
          GoRoute(path: '/admin/private-chats', builder: (_, __) => const AdminPrivateChatsScreen()),
        ],
      ),

      GoRoute(
        path: '/delivery',
        builder: (_, __) => const DeliveryDashboardScreen(),
      ),
    ],
  );
});
