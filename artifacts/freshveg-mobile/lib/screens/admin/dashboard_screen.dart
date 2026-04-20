import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../config/theme.dart';
import '../../models/order.dart';
import '../../services/api_client.dart';
import '../../widgets/order_status_badge.dart';
import 'admin_shell.dart';

final _dashboardProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final res = await apiClient.get('/admin/stats');
  return res.data as Map<String, dynamic>;
});

final _recentOrdersProvider = FutureProvider<List<Order>>((ref) async {
  final res = await apiClient.get('/orders', params: {'limit': '5', 'sort': 'newest'});
  return (res.data as List).map((e) => Order.fromJson(e)).toList();
});

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statsAsync = ref.watch(_dashboardProvider);
    final ordersAsync = ref.watch(_recentOrdersProvider);

    return Scaffold(
      appBar: AdminAppBar(title: 'Dashboard'),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(_dashboardProvider);
          ref.invalidate(_recentOrdersProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            statsAsync.when(
              data: (stats) => _StatsGrid(stats: stats),
              loading: () => const Center(
                  child: Padding(
                      padding: EdgeInsets.all(24),
                      child: CircularProgressIndicator())),
              error: (e, _) => Text('Error: $e'),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Recent Orders',
                    style:
                        TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                TextButton(
                  onPressed: () => context.go('/admin/orders'),
                  child: const Text('View All'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ordersAsync.when(
              data: (orders) => Column(
                children: orders
                    .map((o) => _OrderTile(order: o))
                    .toList(),
              ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Text('Error: $e'),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatsGrid extends StatelessWidget {
  final Map<String, dynamic> stats;

  const _StatsGrid({required this.stats});

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      childAspectRatio: 1.5,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      children: [
        _StatCard(
          label: "Today's Orders",
          value: '${stats['todayOrders'] ?? 0}',
          icon: Icons.receipt_long,
          color: Colors.blue,
        ),
        _StatCard(
          label: 'Total Revenue',
          value: 'EGP ${(stats['totalRevenue'] ?? 0).toStringAsFixed(0)}',
          icon: Icons.attach_money,
          color: kPrimaryGreen,
        ),
        _StatCard(
          label: 'Customers',
          value: '${stats['totalCustomers'] ?? 0}',
          icon: Icons.people,
          color: Colors.purple,
        ),
        _StatCard(
          label: 'Pending',
          value: '${stats['pendingOrders'] ?? 0}',
          icon: Icons.hourglass_empty,
          color: Colors.orange,
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, color: color, size: 18),
                ),
                const Spacer(),
              ],
            ),
            const Spacer(),
            Text(value,
                style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: color)),
            Text(label,
                style: const TextStyle(color: Colors.grey, fontSize: 12)),
          ],
        ),
      ),
    );
  }
}

class _OrderTile extends StatelessWidget {
  final Order order;

  const _OrderTile({required this.order});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text('Order #${order.id} — ${order.customerName}'),
        subtitle: Text('EGP ${order.displayTotal.toStringAsFixed(2)}'),
        trailing: OrderStatusBadge(status: order.status),
        onTap: () => context.go('/admin/orders'),
      ),
    );
  }
}
