import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../config/theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/order.dart';
import '../../services/api_client.dart';
import '../../widgets/order_status_badge.dart';

class OrderConfirmationScreen extends StatefulWidget {
  final int orderId;

  const OrderConfirmationScreen({super.key, required this.orderId});

  @override
  State<OrderConfirmationScreen> createState() => _OrderConfirmationScreenState();
}

class _OrderConfirmationScreenState extends State<OrderConfirmationScreen> {
  Order? _order;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadOrder();
  }

  Future<void> _loadOrder() async {
    try {
      final res = await apiClient.get('/orders/${widget.orderId}');
      setState(() {
        _order = Order.fromJson(res.data);
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    const Spacer(),
                    Container(
                      width: 100,
                      height: 100,
                      decoration: BoxDecoration(
                        color: kPrimaryGreen.withOpacity(0.1),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.check_circle,
                          color: kPrimaryGreen, size: 64),
                    )
                        .animate()
                        .scale(duration: 600.ms, curve: Curves.elasticOut),
                    const SizedBox(height: 24),
                    Text(
                      l10n.orderConfirmed,
                      style: const TextStyle(
                          fontSize: 28, fontWeight: FontWeight.bold),
                    ).animate().fadeIn(delay: 300.ms),
                    const SizedBox(height: 8),
                    Text(
                      'Order #${widget.orderId}',
                      style: const TextStyle(color: Colors.grey, fontSize: 16),
                    ).animate().fadeIn(delay: 400.ms),
                    const SizedBox(height: 32),
                    if (_order != null) ...[
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            children: [
                              _InfoRow('Status', child: OrderStatusBadge(status: _order!.status)),
                              _InfoRow('Items', text: '${_order!.items.length} items'),
                              _InfoRow('Total',
                                  text: 'EGP ${_order!.displayTotal.toStringAsFixed(2)}'),
                              if (_order!.deliveryAddress != null)
                                _InfoRow('Delivery to',
                                    text: _order!.deliveryAddress!),
                            ],
                          ),
                        ),
                      ).animate().fadeIn(delay: 500.ms).slideY(begin: 0.2),
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.blue.shade50,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.info_outline, color: Colors.blue),
                            const SizedBox(width: 12),
                            const Expanded(
                              child: Text(
                                'You\'ll receive updates on your order status. Our team will prepare and deliver your order soon.',
                                style: TextStyle(
                                    color: Colors.blue, fontSize: 13),
                              ),
                            ),
                          ],
                        ),
                      ).animate().fadeIn(delay: 600.ms),
                    ],
                    const Spacer(),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () => context.go('/account'),
                        child: Text(l10n.trackOrder),
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: () => context.go('/home'),
                        child: Text(l10n.continueShopping),
                      ),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String? text;
  final Widget? child;

  const _InfoRow(this.label, {this.text, this.child});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey)),
          child ?? Text(text ?? '', style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
