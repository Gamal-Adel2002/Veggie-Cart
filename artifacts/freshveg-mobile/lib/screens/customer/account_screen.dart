import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../config/theme.dart';
import '../../models/order.dart';
import '../../providers/auth_provider.dart';
import '../../providers/locale_provider.dart';
import '../../app.dart';
import '../../services/api_client.dart';
import '../../widgets/order_status_badge.dart';
import '../../widgets/empty_state.dart';

final _myOrdersProvider = FutureProvider<List<Order>>((ref) async {
  final res = await apiClient.get('/orders/my');
  return (res.data as List).map((e) => Order.fromJson(e)).toList();
});

class AccountScreen extends ConsumerStatefulWidget {
  const AccountScreen({super.key});

  @override
  ConsumerState<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends ConsumerState<AccountScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tab;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final locale = ref.watch(localeProvider);
    final themeMode = ref.watch(themeModeProvider);

    if (!auth.isLoggedIn) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.person_outline, size: 72, color: Colors.grey),
              const SizedBox(height: 16),
              const Text('Sign in to view your account',
                  style: TextStyle(fontSize: 16, color: Colors.grey)),
              const SizedBox(height: 24),
              ElevatedButton(
                  onPressed: () => context.go('/login'),
                  child: const Text('Sign In')),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Account'),
        bottom: TabBar(
          controller: _tab,
          tabs: const [
            Tab(text: 'Profile'),
            Tab(text: 'My Orders'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tab,
        children: [
          _ProfileTab(locale: locale, themeMode: themeMode),
          const _OrdersTab(),
        ],
      ),
    );
  }
}

class _ProfileTab extends ConsumerWidget {
  final locale;
  final themeMode;

  const _ProfileTab({required this.locale, required this.themeMode});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user!;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Center(
          child: Column(
            children: [
              CircleAvatar(
                radius: 44,
                backgroundColor: kPrimaryGreen.withOpacity(0.1),
                child: Text(
                  user.name.isNotEmpty ? user.name[0].toUpperCase() : 'U',
                  style: const TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: kPrimaryGreen),
                ),
              ),
              const SizedBox(height: 12),
              Text(user.name,
                  style: const TextStyle(
                      fontSize: 20, fontWeight: FontWeight.bold)),
              Text(user.email,
                  style: const TextStyle(color: Colors.grey)),
              if (user.phone != null)
                Text(user.phone!,
                    style: const TextStyle(color: Colors.grey, fontSize: 13)),
            ],
          ),
        ),
        const SizedBox(height: 32),
        const Text('Settings',
            style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Colors.grey)),
        const SizedBox(height: 8),
        Card(
          child: Column(
            children: [
              SwitchListTile(
                title: const Text('Dark Mode'),
                secondary: const Icon(Icons.dark_mode_outlined),
                value: themeMode == ThemeMode.dark,
                onChanged: (_) =>
                    ref.read(themeModeProvider.notifier).toggle(),
              ),
              const Divider(height: 0),
              ListTile(
                leading: const Icon(Icons.language),
                title: const Text('Language'),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _LangChip(
                      label: 'EN',
                      selected: locale.languageCode == 'en',
                      onTap: () =>
                          ref.read(localeProvider.notifier).setLocale('en'),
                    ),
                    const SizedBox(width: 8),
                    _LangChip(
                      label: 'AR',
                      selected: locale.languageCode == 'ar',
                      onTap: () =>
                          ref.read(localeProvider.notifier).setLocale('ar'),
                    ),
                  ],
                ),
              ),
              const Divider(height: 0),
              ListTile(
                leading: const Icon(Icons.chat_outlined),
                title: const Text('Messages'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.go('/messages'),
              ),
              const Divider(height: 0),
              ListTile(
                leading: const Icon(Icons.logout, color: Colors.red),
                title: const Text('Logout',
                    style: TextStyle(color: Colors.red)),
                onTap: () async {
                  await ref.read(authProvider.notifier).logout();
                  if (context.mounted) context.go('/role-select');
                },
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _LangChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _LangChip({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: BoxDecoration(
          color: selected ? kPrimaryGreen : Colors.transparent,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
              color: selected ? kPrimaryGreen : Colors.grey.shade300),
        ),
        child: Text(label,
            style: TextStyle(
                color: selected ? Colors.white : Colors.grey,
                fontWeight: FontWeight.w600,
                fontSize: 12)),
      ),
    );
  }
}

class _OrdersTab extends ConsumerWidget {
  const _OrdersTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ordersAsync = ref.watch(_myOrdersProvider);

    return ordersAsync.when(
      data: (orders) => orders.isEmpty
          ? const EmptyState(
              message: 'No orders yet.\nStart shopping!',
              icon: Icons.receipt_long_outlined,
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: orders.length,
              itemBuilder: (_, i) {
                final order = orders[i];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Order #${order.id}',
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16)),
                            OrderStatusBadge(status: order.status),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '${order.items.length} item${order.items.length != 1 ? 's' : ''}  •  EGP ${order.displayTotal.toStringAsFixed(2)}',
                          style: const TextStyle(color: Colors.grey),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _formatDate(order.createdAt),
                          style: const TextStyle(
                              color: Colors.grey, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Error: $e')),
    );
  }

  String _formatDate(String s) {
    try {
      final d = DateTime.parse(s).toLocal();
      return '${d.day}/${d.month}/${d.year}  ${d.hour}:${d.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return s;
    }
  }
}
