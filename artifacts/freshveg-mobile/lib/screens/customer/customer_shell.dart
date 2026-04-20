import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../l10n/app_localizations.dart';
import '../../providers/cart_provider.dart';

class CustomerShell extends ConsumerWidget {
  final Widget child;

  const CustomerShell({super.key, required this.child});

  int _currentIndex(BuildContext context) {
    final path = GoRouterState.of(context).uri.path;
    if (path.startsWith('/shop') || path.startsWith('/product')) return 1;
    if (path.startsWith('/cart')) return 2;
    if (path.startsWith('/feed')) return 3;
    if (path.startsWith('/account')) return 4;
    return 0;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cartCount = ref.watch(cartCountProvider);
    final idx = _currentIndex(context);
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: idx,
        onDestinationSelected: (i) {
          switch (i) {
            case 0:
              context.go('/home');
            case 1:
              context.go('/shop');
            case 2:
              context.go('/cart');
            case 3:
              context.go('/feed');
            case 4:
              context.go('/account');
          }
        },
        destinations: [
          NavigationDestination(
              icon: const Icon(Icons.home_outlined),
              selectedIcon: const Icon(Icons.home),
              label: l10n.home),
          NavigationDestination(
              icon: const Icon(Icons.store_outlined),
              selectedIcon: const Icon(Icons.store),
              label: l10n.shop),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: cartCount > 0,
              label: Text('$cartCount'),
              child: const Icon(Icons.shopping_cart_outlined),
            ),
            selectedIcon: Badge(
              isLabelVisible: cartCount > 0,
              label: Text('$cartCount'),
              child: const Icon(Icons.shopping_cart),
            ),
            label: l10n.cart,
          ),
          NavigationDestination(
              icon: const Icon(Icons.feed_outlined),
              selectedIcon: const Icon(Icons.feed),
              label: l10n.feed),
          NavigationDestination(
              icon: const Icon(Icons.person_outline),
              selectedIcon: const Icon(Icons.person),
              label: l10n.myAccount),
        ],
      ),
    );
  }
}
