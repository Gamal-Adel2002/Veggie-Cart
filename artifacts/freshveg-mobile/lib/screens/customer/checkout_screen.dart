import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../config/theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/delivery_zone.dart';
import '../../providers/cart_provider.dart';
import '../../services/api_client.dart';

/// Returns distance in kilometres between two lat/lng points (haversine formula).
double _haversineKm(double lat1, double lng1, double lat2, double lng2) {
  const r = 6371.0;
  final dLat = _toRad(lat2 - lat1);
  final dLng = _toRad(lng2 - lng1);
  final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
      math.cos(_toRad(lat1)) *
          math.cos(_toRad(lat2)) *
          math.sin(dLng / 2) *
          math.sin(dLng / 2);
  return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
}

double _toRad(double deg) => deg * math.pi / 180;

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  final _addressCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  final _promoCtrl = TextEditingController();
  String? _appliedPromo;
  double? _discountAmount;
  double? _deliveryFee;
  List<DeliveryZone> _zones = [];
  int? _selectedZoneId;
  LatLng? _selectedLocation;
  String? _zoneValidationError;
  bool _showMap = false;
  bool _loading = false;
  bool _promoLoading = false;

  /// Returns the matching active zone for [pos], or null if outside all zones.
  DeliveryZone? _zoneForPoint(LatLng pos) {
    for (final zone in _zones.where((z) => z.active)) {
      final dist = _haversineKm(
          pos.latitude, pos.longitude, zone.centerLat, zone.centerLng);
      if (dist <= zone.radiusKm) return zone;
    }
    return null;
  }

  void _handleMapTap(LatLng pos) {
    final zone = _zoneForPoint(pos);
    setState(() {
      _selectedLocation = pos;
      _showMap = false;
      if (zone != null) {
        _selectedZoneId = zone.id;
        _deliveryFee = zone.fee > 0 ? zone.fee : _deliveryFee;
        _zoneValidationError = null;
      } else if (_zones.isNotEmpty) {
        _selectedZoneId = null;
        _deliveryFee = null;
        _zoneValidationError =
            'This location is outside our delivery zones. Please choose a location within a service area.';
      }
    });
  }

  @override
  void initState() {
    super.initState();
    _loadZones();
  }

  @override
  void dispose() {
    _addressCtrl.dispose();
    _notesCtrl.dispose();
    _promoCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadZones() async {
    try {
      final res = await apiClient.get('/delivery-zones');
      setState(() {
        _zones = (res.data as List).map((e) => DeliveryZone.fromJson(e)).toList();
      });
    } catch (_) {}
  }

  Future<void> _applyPromo() async {
    if (_promoCtrl.text.isEmpty) return;
    setState(() => _promoLoading = true);
    try {
      final cartNotifier = ref.read(cartProvider.notifier);
      final subtotal = cartNotifier.subtotal;
      final res = await apiClient.post('/promo-codes/validate', data: {
        'code': _promoCtrl.text.trim(),
        'subtotal': subtotal,
      });
      setState(() {
        _appliedPromo = _promoCtrl.text.trim();
        _discountAmount = (res.data['discountAmount'] as num?)?.toDouble();
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(AppLocalizations.of(context)!.invalidPromoCode), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _promoLoading = false);
    }
  }

  Future<void> _placeOrder() async {
    if (_addressCtrl.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(AppLocalizations.of(context)!.enterDeliveryAddress)),
      );
      return;
    }
    // Zone validation: if location pinned but outside all zones, block order
    if (_selectedLocation != null && _zones.isNotEmpty &&
        _zoneForPoint(_selectedLocation!) == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(AppLocalizations.of(context)!.outsideDeliveryZone),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }
    setState(() => _loading = true);
    try {
      final cart = ref.read(cartProvider);
      final res = await apiClient.post('/orders', data: {
        'items': cart.map((i) => {'productId': i.productId, 'quantity': i.quantity}).toList(),
        'deliveryAddress': _addressCtrl.text.trim(),
        'notes': _notesCtrl.text.trim(),
        'promoCode': _appliedPromo,
        'zoneId': _selectedZoneId,
        'latitude': _selectedLocation?.latitude,
        'longitude': _selectedLocation?.longitude,
      });
      final orderId = res.data['id'] as int;
      ref.read(cartProvider.notifier).clear();
      if (mounted) context.go('/order-confirmation/$orderId');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to place order: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartProvider);
    final cartNotifier = ref.read(cartProvider.notifier);
    final subtotal = cartNotifier.subtotal;
    final discount = _discountAmount ?? 0;
    final fee = _deliveryFee ?? 0;
    final total = subtotal - discount + fee;

    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.checkout)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(l10n.orderSummary,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            ...cart.map((item) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                          child: Text('${item.name} x${item.quantity}',
                              style: const TextStyle(fontSize: 13))),
                      Text('EGP ${item.subtotal.toStringAsFixed(2)}',
                          style: const TextStyle(fontWeight: FontWeight.w600)),
                    ],
                  ),
                )),
            const Divider(height: 24),
            Text(l10n.deliveryAddress,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            TextField(
              controller: _addressCtrl,
              decoration: InputDecoration(
                hintText: l10n.deliveryAddress,
                prefixIcon: const Icon(Icons.location_on_outlined),
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 12),
            if (_zones.isNotEmpty) ...[
              Text(l10n.deliveryZone,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              DropdownButtonFormField<int>(
                value: _selectedZoneId,
                hint: Text(l10n.deliveryZone),
                items: _zones
                    .map((z) => DropdownMenuItem(
                        value: z.id, child: Text(z.name)))
                    .toList(),
                onChanged: (v) {
                  final zone = _zones.firstWhere((z) => z.id == v);
                  setState(() {
                    _selectedZoneId = v;
                    _deliveryFee = zone.fee > 0 ? zone.fee : null;
                  });
                },
                decoration: const InputDecoration(),
              ),
              const SizedBox(height: 12),
            ],
            OutlinedButton.icon(
              icon: const Icon(Icons.map_outlined),
              label: Text(_selectedLocation == null
                  ? 'Pin Location on Map'
                  : _zoneValidationError != null
                      ? 'Outside Delivery Zone ⚠'
                      : 'Location Selected ✓'),
              onPressed: () => setState(() => _showMap = !_showMap),
              style: OutlinedButton.styleFrom(
                foregroundColor: _zoneValidationError != null
                    ? Colors.red
                    : _selectedLocation != null
                        ? kPrimaryGreen
                        : null,
                side: _zoneValidationError != null
                    ? const BorderSide(color: Colors.red)
                    : null,
              ),
            ),
            if (_zoneValidationError != null)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Row(
                  children: [
                    const Icon(Icons.warning_amber_rounded,
                        size: 14, color: Colors.red),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        _zoneValidationError!,
                        style: const TextStyle(
                            color: Colors.red, fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
            if (_showMap) ...[
              const SizedBox(height: 12),
              SizedBox(
                height: 220,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: GoogleMap(
                    initialCameraPosition: const CameraPosition(
                      target: LatLng(30.0444, 31.2357),
                      zoom: 12,
                    ),
                    onTap: _handleMapTap,
                    markers: _selectedLocation != null
                        ? {
                            Marker(
                              markerId: const MarkerId('loc'),
                              position: _selectedLocation!,
                            )
                          }
                        : {},
                  ),
                ),
              ),
            ],
            const SizedBox(height: 16),
            const Text('Order Notes',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            TextField(
              controller: _notesCtrl,
              decoration: const InputDecoration(
                hintText: 'Any special instructions? (optional)',
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 16),
            const Text('Promo Code',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _promoCtrl,
                    decoration: InputDecoration(
                      hintText: 'Enter code',
                      suffixIcon: _appliedPromo != null
                          ? const Icon(Icons.check_circle, color: Colors.green)
                          : null,
                    ),
                    textCapitalization: TextCapitalization.characters,
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: _promoLoading ? null : _applyPromo,
                  style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14)),
                  child: _promoLoading
                      ? const SizedBox(
                          width: 18, height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Apply'),
                ),
              ],
            ),
            const SizedBox(height: 24),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _SummaryRow('Subtotal', 'EGP ${subtotal.toStringAsFixed(2)}'),
                    if (discount > 0)
                      _SummaryRow('Discount', '- EGP ${discount.toStringAsFixed(2)}',
                          color: Colors.green),
                    _SummaryRow('Delivery Fee',
                        fee > 0 ? 'EGP ${fee.toStringAsFixed(2)}' : 'Calculated at delivery'),
                    const Divider(),
                    _SummaryRow('Total', 'EGP ${total.toStringAsFixed(2)}',
                        bold: true),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Row(
                  children: [
                    Icon(Icons.payments_outlined, color: kPrimaryGreen),
                    SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Payment Method',
                            style: TextStyle(
                                fontWeight: FontWeight.w600, fontSize: 13)),
                        Text('Cash on Delivery',
                            style: TextStyle(color: Colors.grey)),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _loading ? null : _placeOrder,
                style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                child: _loading
                    ? const SizedBox(
                        width: 22, height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Place Order', style: TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;
  final bool bold;
  final Color? color;

  const _SummaryRow(this.label, this.value, {this.bold = false, this.color});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: TextStyle(
                  fontWeight: bold ? FontWeight.bold : FontWeight.normal,
                  fontSize: bold ? 16 : 14)),
          Text(value,
              style: TextStyle(
                  fontWeight: bold ? FontWeight.bold : FontWeight.w600,
                  fontSize: bold ? 16 : 14,
                  color: color ?? (bold ? kPrimaryGreen : null))),
        ],
      ),
    );
  }
}
