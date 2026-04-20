import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../config/theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/order.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_client.dart';
import '../../widgets/order_status_badge.dart';
import '../../widgets/empty_state.dart';

/// Haversine distance in metres between two lat/lng points.
double _haversineM(double lat1, double lng1, double lat2, double lng2) {
  const r = 6371000.0;
  final dLat = (lat2 - lat1) * math.pi / 180;
  final dLng = (lng2 - lng1) * math.pi / 180;
  final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
      math.cos(lat1 * math.pi / 180) *
          math.cos(lat2 * math.pi / 180) *
          math.sin(dLng / 2) *
          math.sin(dLng / 2);
  return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
}

final _myDeliveriesProvider = FutureProvider<List<Order>>((ref) async {
  final res = await apiClient.get('/delivery-portal/my-orders');
  return (res.data as List).map((e) => Order.fromJson(e)).toList();
});

final _deliveryStatsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final res = await apiClient.get('/delivery-portal/stats');
  return res.data as Map<String, dynamic>;
});

class DeliveryDashboardScreen extends ConsumerStatefulWidget {
  const DeliveryDashboardScreen({super.key});

  @override
  ConsumerState<DeliveryDashboardScreen> createState() => _DeliveryDashboardScreenState();
}

class _DeliveryDashboardScreenState extends ConsumerState<DeliveryDashboardScreen>
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
    final user = ref.watch(authProvider).user;
    final statsAsync = ref.watch(_deliveryStatsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('Hi, ${user?.name ?? 'Driver'}!'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.invalidate(_myDeliveriesProvider);
              ref.invalidate(_deliveryStatsProvider);
            },
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) context.go('/role-select');
            },
          ),
        ],
        bottom: TabBar(
          controller: _tab,
          tabs: const [
            Tab(text: 'Active Deliveries'),
            Tab(text: 'Today Summary'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tab,
        children: [
          const _ActiveDeliveriesTab(),
          _SummaryTab(statsAsync: statsAsync),
        ],
      ),
    );
  }
}

class _ActiveDeliveriesTab extends ConsumerWidget {
  const _ActiveDeliveriesTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final deliveriesAsync = ref.watch(_myDeliveriesProvider);

    return deliveriesAsync.when(
      data: (orders) {
        final active = orders
            .where((o) => o.status != 'delivered' && o.status != 'cancelled')
            .toList();

        if (active.isEmpty) {
          return const EmptyState(
            message: 'No active deliveries.\nCheck back soon!',
            icon: Icons.delivery_dining_outlined,
          );
        }

        // Group orders by zone name (or "No Zone" when null)
        final Map<String, List<Order>> grouped = {};
        for (final o in active) {
          final key = (o.zoneName?.isNotEmpty == true)
              ? o.zoneName!
              : 'Other / No Zone';
          grouped.putIfAbsent(key, () => []).add(o);
        }

        // Sort zone groups: named zones first, then "Other"
        final sortedZones = grouped.keys.toList()
          ..sort((a, b) {
            if (a == 'Other / No Zone') return 1;
            if (b == 'Other / No Zone') return -1;
            return a.compareTo(b);
          });

        // Within each zone, sort orders by proximity (greedy nearest-neighbor).
        // Orders with GPS coordinates are sorted first in a route order,
        // orders without coordinates are appended at the end.
        for (final zone in sortedZones) {
          final orders = grouped[zone]!;
          final withCoords = orders
              .where((o) => o.latitude != null && o.longitude != null)
              .toList();
          final noCoords = orders
              .where((o) => o.latitude == null || o.longitude == null)
              .toList();

          if (withCoords.length > 1) {
            // Compute zone centroid as starting reference
            final cLat = withCoords.map((o) => o.latitude!).reduce((a, b) => a + b) /
                withCoords.length;
            final cLng = withCoords.map((o) => o.longitude!).reduce((a, b) => a + b) /
                withCoords.length;

            // Greedy nearest-neighbor route starting from centroid
            final sorted = <Order>[];
            final remaining = List<Order>.from(withCoords);
            double curLat = cLat, curLng = cLng;
            while (remaining.isNotEmpty) {
              remaining.sort((a, b) => _haversineM(curLat, curLng, a.latitude!, a.longitude!)
                  .compareTo(_haversineM(curLat, curLng, b.latitude!, b.longitude!)));
              final nearest = remaining.removeAt(0);
              sorted.add(nearest);
              curLat = nearest.latitude!;
              curLng = nearest.longitude!;
            }
            grouped[zone] = [...sorted, ...noCoords];
          }
        }

        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(_myDeliveriesProvider),
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(vertical: 8),
            itemCount: sortedZones.length,
            itemBuilder: (_, gi) {
              final zoneName = sortedZones[gi];
              final zoneOrders = grouped[zoneName]!;
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Zone section header
                  Container(
                    margin: const EdgeInsets.fromLTRB(12, 8, 12, 4),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: kPrimaryGreen.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border:
                          Border.all(color: kPrimaryGreen.withValues(alpha: 0.2)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.map_outlined,
                            size: 16, color: kPrimaryGreen),
                        const SizedBox(width: 6),
                        Text(
                          zoneName,
                          style: const TextStyle(
                              color: kPrimaryGreen,
                              fontWeight: FontWeight.w700,
                              fontSize: 13),
                        ),
                        const Spacer(),
                        Text(
                          '${zoneOrders.length} order${zoneOrders.length > 1 ? 's' : ''}',
                          style: TextStyle(
                              color: kPrimaryGreen.withValues(alpha: 0.7),
                              fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                  ...zoneOrders.map((o) =>
                      _DeliveryCard(order: o, ref: ref)),
                ],
              );
            },
          ),
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Error: $e')),
    );
  }
}

class _DeliveryCard extends StatelessWidget {
  final Order order;
  final WidgetRef ref;

  const _DeliveryCard({required this.order, required this.ref});

  Future<void> _markDelivered(BuildContext context) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Confirm Delivery'),
        content: Text('Mark order #${order.id} as delivered?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel')),
          ElevatedButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Confirm')),
        ],
      ),
    ) ?? false;

    if (!ok) return;
    try {
      await apiClient.patch('/delivery-portal/orders/${order.id}/delivered');
      ref.invalidate(_myDeliveriesProvider);
      ref.invalidate(_deliveryStatsProvider);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
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
                        fontWeight: FontWeight.bold, fontSize: 16)),
                OrderStatusBadge(status: order.status),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.person_outline, size: 16, color: Colors.grey),
                const SizedBox(width: 6),
                Text(order.customerName),
              ],
            ),
            const SizedBox(height: 4),
            if (order.deliveryAddress != null)
              Row(
                children: [
                  const Icon(Icons.location_on_outlined, size: 16, color: Colors.grey),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      order.deliveryAddress!,
                      style: const TextStyle(color: Colors.grey, fontSize: 13),
                    ),
                  ),
                ],
              ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.phone, size: 16),
                    label: Text(l10n.callDriver),
                    onPressed: () => launchUrl(
                        Uri.parse('tel:${order.customerPhone}')),
                  ),
                ),
                const SizedBox(width: 8),
                if (order.latitude != null && order.longitude != null)
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.map_outlined, size: 16),
                      label: Text(l10n.openMap),
                      onPressed: () => _showMap(context, order),
                    ),
                  ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.check, size: 16),
                    label: Text(l10n.delivered),
                    onPressed: () => _markDelivered(context),
                    style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        foregroundColor: Colors.white),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showMap(BuildContext context, Order order) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => SizedBox(
        height: MediaQuery.of(context).size.height * 0.6,
        child: GoogleMap(
          initialCameraPosition: CameraPosition(
            target: LatLng(order.latitude!, order.longitude!),
            zoom: 15,
          ),
          markers: {
            Marker(
              markerId: const MarkerId('delivery'),
              position: LatLng(order.latitude!, order.longitude!),
              infoWindow: InfoWindow(title: order.customerName),
            ),
          },
        ),
      ),
    );
  }
}

class _SummaryTab extends StatelessWidget {
  final AsyncValue<Map<String, dynamic>> statsAsync;

  const _SummaryTab({required this.statsAsync});

  @override
  Widget build(BuildContext context) {
    return statsAsync.when(
      data: (stats) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: _StatCard(
                    label: 'Completed',
                    value: '${stats['completedToday'] ?? 0}',
                    icon: Icons.check_circle_outline,
                    color: Colors.green,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatCard(
                    label: 'Pending',
                    value: '${stats['pendingOrders'] ?? 0}',
                    icon: Icons.hourglass_empty,
                    color: Colors.orange,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _StatCard(
              label: "Today's Earnings",
              value: 'EGP ${(stats['earnings'] ?? 0).toStringAsFixed(0)}',
              icon: Icons.attach_money,
              color: kPrimaryGreen,
              fullWidth: true,
            ),
            const SizedBox(height: 32),
            const Text(
              'Keep up the great work! 🚚',
              style: TextStyle(fontSize: 16, color: Colors.grey),
            ),
          ],
        ),
      ),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (_, __) => const Center(child: Text('No stats available')),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final bool fullWidth;

  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    this.fullWidth = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: fullWidth ? double.infinity : null,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 32),
          const SizedBox(height: 8),
          Text(value,
              style: TextStyle(
                  fontSize: 24, fontWeight: FontWeight.bold, color: color)),
          Text(label, style: const TextStyle(color: Colors.grey, fontSize: 13)),
        ],
      ),
    );
  }
}
