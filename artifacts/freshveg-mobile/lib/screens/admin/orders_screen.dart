import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/theme.dart';
import '../../models/order.dart';
import '../../models/user.dart';
import '../../services/api_client.dart';
import '../../widgets/order_status_badge.dart';
import '../../widgets/empty_state.dart';
import 'admin_shell.dart';

final _adminOrdersProvider =
    FutureProvider.family<List<Order>, String>((ref, status) async {
  final params = status == 'all' ? <String, String>{} : {'status': status};
  final res = await apiClient.get('/orders', params: params);
  return (res.data as List).map((e) => Order.fromJson(e)).toList();
});

final _deliveryPersonsProvider = FutureProvider<List<DeliveryPerson>>((ref) async {
  final res = await apiClient.get('/admin/delivery-persons');
  return (res.data as List).map((e) => DeliveryPerson.fromJson(e)).toList();
});

class AdminOrdersScreen extends ConsumerStatefulWidget {
  const AdminOrdersScreen({super.key});

  @override
  ConsumerState<AdminOrdersScreen> createState() => _AdminOrdersScreenState();
}

class _AdminOrdersScreenState extends ConsumerState<AdminOrdersScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tab;
  final _statuses = ['all', 'waiting', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: _statuses.length, vsync: this);
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AdminAppBar(
        title: 'Orders',
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              for (final s in _statuses) {
                ref.invalidate(_adminOrdersProvider(s));
              }
            },
          ),
        ],
      ),
      body: Column(
        children: [
          TabBar(
            controller: _tab,
            isScrollable: true,
            tabs: _statuses
                .map((s) => Tab(text: _label(s)))
                .toList(),
          ),
          Expanded(
            child: TabBarView(
              controller: _tab,
              children: _statuses
                  .map((s) => _OrderList(status: s))
                  .toList(),
            ),
          ),
        ],
      ),
    );
  }

  String _label(String s) {
    switch (s) {
      case 'all':
        return 'All';
      case 'waiting':
        return 'Waiting';
      case 'confirmed':
        return 'Confirmed';
      case 'preparing':
        return 'Preparing';
      case 'out_for_delivery':
        return 'Out for Delivery';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return s;
    }
  }
}

class _OrderList extends ConsumerWidget {
  final String status;

  const _OrderList({required this.status});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ordersAsync = ref.watch(_adminOrdersProvider(status));

    return ordersAsync.when(
      data: (orders) => orders.isEmpty
          ? const EmptyState(message: 'No orders', icon: Icons.receipt_long_outlined)
          : RefreshIndicator(
              onRefresh: () async => ref.invalidate(_adminOrdersProvider(status)),
              child: ListView.builder(
                padding: const EdgeInsets.all(12),
                itemCount: orders.length,
                itemBuilder: (_, i) => _OrderCard(order: orders[i], ref: ref),
              ),
            ),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Error: $e')),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final Order order;
  final WidgetRef ref;

  const _OrderCard({required this.order, required this.ref});

  Future<void> _updateStatus(BuildContext context, String status) async {
    try {
      await apiClient.patch('/orders/${order.id}/status',
          data: {'status': status});
      for (final s in ['all', 'waiting', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled']) {
        ref.invalidate(_adminOrdersProvider(s));
      }
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Status updated')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _assign(BuildContext context) async {
    final persons = await ref.read(_deliveryPersonsProvider.future);
    if (!context.mounted) return;

    final selected = await showDialog<int>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Assign Delivery Person'),
        content: SizedBox(
          width: 300,
          child: ListView(
            shrinkWrap: true,
            children: persons
                .map((p) => ListTile(
                      title: Text(p.name),
                      subtitle: Text(p.phone ?? ''),
                      onTap: () => Navigator.of(context).pop(p.id),
                    ))
                .toList(),
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel')),
        ],
      ),
    );

    if (selected != null) {
      try {
        await apiClient.patch('/orders/${order.id}/assign',
            data: {'deliveryPersonId': selected});
        ref.invalidate(_adminOrdersProvider('all'));
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Delivery person assigned')),
          );
        }
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ExpansionTile(
        title: Row(
          children: [
            Text('Order #${order.id}',
                style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(width: 8),
            OrderStatusBadge(status: order.status),
          ],
        ),
        subtitle: Text(
          '${order.customerName}  •  EGP ${order.displayTotal.toStringAsFixed(2)}',
          style: const TextStyle(fontSize: 13),
        ),
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Items:', style: TextStyle(fontWeight: FontWeight.bold)),
                ...order.items.map((item) => Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('${item.productName} x${item.quantity}'),
                          Text('EGP ${item.subtotal.toStringAsFixed(2)}'),
                        ],
                      ),
                    )),
                const Divider(),
                if (order.deliveryAddress != null) ...[
                  Text('Address: ${order.deliveryAddress}',
                      style: const TextStyle(fontSize: 13)),
                  const SizedBox(height: 4),
                ],
                if (order.notes != null && order.notes!.isNotEmpty) ...[
                  Text('Notes: ${order.notes}',
                      style: const TextStyle(fontSize: 13, color: Colors.grey)),
                  const SizedBox(height: 8),
                ],
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: PopupMenuButton<String>(
                        child: OutlinedButton.icon(
                          onPressed: null,
                          icon: const Icon(Icons.edit_outlined, size: 16),
                          label: const Text('Update Status'),
                        ),
                        onSelected: (s) => _updateStatus(context, s),
                        itemBuilder: (_) => [
                          'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled',
                        ].map((s) => PopupMenuItem(value: s, child: Text(s))).toList(),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      icon: const Icon(Icons.delivery_dining_outlined),
                      tooltip: 'Assign',
                      onPressed: () => _assign(context),
                    ),
                    IconButton(
                      icon: const Icon(Icons.phone, color: kPrimaryGreen),
                      tooltip: 'Call',
                      onPressed: () => launchUrl(
                          Uri.parse('tel:${order.customerPhone}')),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
