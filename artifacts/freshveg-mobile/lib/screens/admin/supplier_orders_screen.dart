import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../config/theme.dart';
import '../../models/supplier.dart';
import '../../services/api_client.dart';
import '../../widgets/empty_state.dart';
import 'admin_shell.dart';

final _supplierOrdersProvider = FutureProvider<List<SupplierOrder>>((ref) async {
  final res = await apiClient.get('/supplier-orders');
  return (res.data as List).map((e) => SupplierOrder.fromJson(e)).toList();
});

final _suppliersListProvider = FutureProvider<List<Supplier>>((ref) async {
  final res = await apiClient.get('/suppliers');
  return (res.data as List).map((e) => Supplier.fromJson(e)).toList();
});

class SupplierOrdersScreen extends ConsumerWidget {
  const SupplierOrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ordersAsync = ref.watch(_supplierOrdersProvider);

    return Scaffold(
      appBar: AdminAppBar(
        title: 'Supplier Orders',
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _openForm(context, ref),
          ),
        ],
      ),
      body: ordersAsync.when(
        data: (orders) => orders.isEmpty
            ? const EmptyState(message: 'No supplier orders', icon: Icons.shopping_bag_outlined)
            : ListView.builder(
                padding: const EdgeInsets.all(12),
                itemCount: orders.length,
                itemBuilder: (_, i) {
                  final o = orders[i];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 10),
                    child: ExpansionTile(
                      title: Text(
                          '${o.supplier?.name ?? 'Supplier'} — #${o.id}',
                          style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text(
                          'EGP ${o.totalPrice.toStringAsFixed(2)}  •  ${_formatDate(o.orderedAt)}'),
                      children: [
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Items:',
                                  style: TextStyle(fontWeight: FontWeight.bold)),
                              ...o.items.map((item) => Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 3),
                                    child: Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Expanded(
                                            child: Text(
                                                '${item.productName} x${item.quantity}')),
                                        Text(
                                            'EGP ${item.subtotal.toStringAsFixed(2)}'),
                                      ],
                                    ),
                                  )),
                              if (o.notes != null && o.notes!.isNotEmpty) ...[
                                const Divider(),
                                Text('Notes: ${o.notes}',
                                    style: const TextStyle(color: Colors.grey)),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }

  String _formatDate(String s) {
    try {
      final d = DateTime.parse(s).toLocal();
      return '${d.day}/${d.month}/${d.year}';
    } catch (_) {
      return s;
    }
  }

  void _openForm(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _SupplierOrderForm(
        onSaved: () {
          ref.invalidate(_supplierOrdersProvider);
          Navigator.of(context).pop();
        },
      ),
    );
  }
}

class _SupplierOrderForm extends ConsumerStatefulWidget {
  final VoidCallback onSaved;

  const _SupplierOrderForm({required this.onSaved});

  @override
  ConsumerState<_SupplierOrderForm> createState() => _SupplierOrderFormState();
}

class _SupplierOrderFormState extends ConsumerState<_SupplierOrderForm> {
  final _notesCtrl = TextEditingController();
  int? _supplierId;
  bool _loading = false;
  List<Map<String, dynamic>> _items = [
    {'productName': '', 'quantity': 1, 'unitPrice': 0.0}
  ];

  @override
  void dispose() {
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_supplierId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a supplier')),
      );
      return;
    }
    setState(() => _loading = true);
    try {
      await apiClient.post('/supplier-orders', data: {
        'supplierId': _supplierId,
        'notes': _notesCtrl.text.trim(),
        'items': _items
            .where((i) => (i['productName'] as String).isNotEmpty)
            .map((i) => {
                  'productName': i['productName'],
                  'quantity': i['quantity'],
                  'unitPrice': i['unitPrice'],
                })
            .toList(),
      });
      widget.onSaved();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final suppliersAsync = ref.watch(_suppliersListProvider);

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('New Supplier Order',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            suppliersAsync.when(
              data: (suppliers) => DropdownButtonFormField<int>(
                value: _supplierId,
                decoration: const InputDecoration(labelText: 'Supplier'),
                items: suppliers
                    .map((s) => DropdownMenuItem(value: s.id, child: Text(s.name)))
                    .toList(),
                onChanged: (v) => setState(() => _supplierId = v),
              ),
              loading: () => const CircularProgressIndicator(),
              error: (_, __) => const Text('Failed to load suppliers'),
            ),
            const SizedBox(height: 16),
            const Text('Items:', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            ..._items.asMap().entries.map((entry) {
              final idx = entry.key;
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  children: [
                    Expanded(
                      flex: 3,
                      child: TextFormField(
                        initialValue: _items[idx]['productName'],
                        decoration: const InputDecoration(labelText: 'Product', isDense: true),
                        onChanged: (v) => _items[idx]['productName'] = v,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: TextFormField(
                        initialValue: '${_items[idx]['quantity']}',
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Qty', isDense: true),
                        onChanged: (v) => _items[idx]['quantity'] = int.tryParse(v) ?? 1,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: TextFormField(
                        initialValue: '${_items[idx]['unitPrice']}',
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Price', isDense: true),
                        onChanged: (v) => _items[idx]['unitPrice'] = double.tryParse(v) ?? 0,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.remove_circle_outline, color: Colors.red, size: 20),
                      onPressed: () => setState(() => _items.removeAt(idx)),
                    ),
                  ],
                ),
              );
            }),
            TextButton.icon(
              icon: const Icon(Icons.add),
              label: const Text('Add Item'),
              onPressed: () => setState(() => _items.add(
                  {'productName': '', 'quantity': 1, 'unitPrice': 0.0})),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _notesCtrl,
              decoration: const InputDecoration(labelText: 'Notes (optional)'),
              maxLines: 2,
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _loading ? null : _save,
                child: _loading
                    ? const SizedBox(
                        height: 20, width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Place Order'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
