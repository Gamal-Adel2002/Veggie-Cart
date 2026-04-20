import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../config/theme.dart';
import '../../l10n/app_localizations.dart';
import '../../providers/auth_provider.dart';

/// GlobalKey for the AdminShell's outer Scaffold, so AdminAppBar can open the
/// drawer even when each admin screen renders its own inner Scaffold.
final adminScaffoldKey = GlobalKey<ScaffoldState>();

class AdminShell extends ConsumerWidget {
  final Widget child;

  const AdminShell({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      key: adminScaffoldKey,
      drawer: _AdminDrawer(),
      body: child,
    );
  }
}

class _AdminDrawer extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final l10n = AppLocalizations.of(context)!;

    return Drawer(
      child: Column(
        children: [
          DrawerHeader(
            decoration: const BoxDecoration(color: kPrimaryGreen),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                const Icon(Icons.eco, color: Colors.white, size: 36),
                const SizedBox(width: 12),
                Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${l10n.appName} Admin',
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold)),
                    Text(user?.email ?? '',
                        style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.8),
                            fontSize: 12)),
                  ],
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: EdgeInsets.zero,
              children: [
                _NavItem(Icons.dashboard_outlined, l10n.dashboard, '/admin'),
                _NavItem(Icons.receipt_long_outlined, l10n.orders, '/admin/orders'),
                _NavItem(Icons.inventory_2_outlined, l10n.products, '/admin/products'),
                _NavItem(Icons.category_outlined, l10n.categories, '/admin/categories'),
                const Divider(),
                _NavItem(Icons.people_outline, l10n.customers, '/admin/customers'),
                _NavItem(Icons.badge_outlined, l10n.staff, '/admin/staff'),
                _NavItem(Icons.local_shipping_outlined, l10n.suppliers, '/admin/suppliers'),
                _NavItem(Icons.shopping_bag_outlined, l10n.supplierOrders, '/admin/supplier-orders'),
                const Divider(),
                _NavItem(Icons.map_outlined, l10n.deliveryZones, '/admin/delivery-zones'),
                _NavItem(Icons.access_time, l10n.storeHours, '/admin/store-hours'),
                _NavItem(Icons.local_offer_outlined, l10n.promoCodes, '/admin/promo-codes'),
                _NavItem(Icons.card_giftcard_outlined, l10n.vouchers, '/admin/vouchers'),
                const Divider(),
                _NavItem(Icons.forum_outlined, l10n.publicChat, '/admin/public-chat'),
                _NavItem(Icons.chat_outlined, l10n.privateChats, '/admin/private-chats'),
                const Divider(),
                ListTile(
                  leading: const Icon(Icons.logout, color: Colors.red),
                  title: Text(l10n.logout,
                      style: const TextStyle(color: Colors.red)),
                  onTap: () async {
                    await ref.read(authProvider.notifier).logout();
                    if (context.mounted) context.go('/role-select');
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String route;

  const _NavItem(this.icon, this.label, this.route);

  @override
  Widget build(BuildContext context) {
    final currentPath = GoRouterState.of(context).uri.path;
    final selected = currentPath == route ||
        (route != '/admin' && currentPath.startsWith(route));

    return ListTile(
      leading: Icon(icon, color: selected ? kPrimaryGreen : null, size: 22),
      title: Text(label,
          style: TextStyle(
              color: selected ? kPrimaryGreen : null,
              fontWeight: selected ? FontWeight.w600 : FontWeight.normal)),
      selected: selected,
      selectedTileColor: kPrimaryGreen.withOpacity(0.08),
      onTap: () {
        context.go(route);
        Navigator.of(context).pop();
      },
    );
  }
}

class AdminAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final List<Widget>? actions;
  final PreferredSizeWidget? bottom;

  const AdminAppBar(
      {super.key, required this.title, this.actions, this.bottom});

  @override
  Widget build(BuildContext context) {
    return AppBar(
      title: Text(title),
      leading: IconButton(
        icon: const Icon(Icons.menu),
        onPressed: () => adminScaffoldKey.currentState?.openDrawer(),
      ),
      actions: actions,
      bottom: bottom,
    );
  }

  @override
  Size get preferredSize => Size.fromHeight(
      kToolbarHeight + (bottom?.preferredSize.height ?? 0));
}
