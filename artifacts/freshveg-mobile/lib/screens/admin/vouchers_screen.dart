import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../config/theme.dart';
import '../../models/promo.dart';
import '../../models/user.dart';
import '../../services/api_client.dart';
import '../../widgets/empty_state.dart';
import 'admin_shell.dart';

final _vouchersProvider = FutureProvider<List<Voucher>>((ref) async {
  final res = await apiClient.get('/vouchers');
  return (res.data as List).map((e) => Voucher.fromJson(e)).toList();
});

final _customersListProvider = FutureProvider<List<AppUser>>((ref) async {
  final res = await apiClient.get('/admin/customers');
  return (res.data as List).map((e) => AppUser.fromJson(e)).toList();
});

class VouchersScreen extends ConsumerWidget {
  const VouchersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final vouchersAsync = ref.watch(_vouchersProvider);

    return Scaffold(
      appBar: AdminAppBar(
        title: 'Vouchers',
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _openForm(context, ref),
          ),
        ],
      ),
      body: vouchersAsync.when(
        data: (vouchers) => vouchers.isEmpty
            ? const EmptyState(message: 'No vouchers issued', icon: Icons.card_giftcard_outlined)
            : ListView.builder(
                padding: const EdgeInsets.all(12),
                itemCount: vouchers.length,
                itemBuilder: (_, i) {
                  final v = vouchers[i];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: v.used
                              ? Colors.grey.shade100
                              : kGold.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(Icons.card_giftcard,
                            color: v.used ? Colors.grey : kGold),
                      ),
                      title: Text(v.customerName ?? 'Customer #${v.userId}',
                          style: const TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: Text(
                          'EGP ${v.amount.toStringAsFixed(2)}  •  ${v.used ? 'Used' : 'Valid'}'),
                      trailing: v.used
                          ? const Icon(Icons.check_circle, color: Colors.grey)
                          : const Icon(Icons.access_time, color: kGold),
                    ),
                  );
                },
              ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }

  void _openForm(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _VoucherForm(
        onSaved: () {
          ref.invalidate(_vouchersProvider);
          Navigator.of(context).pop();
        },
      ),
    );
  }
}

class _VoucherForm extends ConsumerStatefulWidget {
  final VoidCallback onSaved;

  const _VoucherForm({required this.onSaved});

  @override
  ConsumerState<_VoucherForm> createState() => _VoucherFormState();
}

class _VoucherFormState extends ConsumerState<_VoucherForm> {
  final _formKey = GlobalKey<FormState>();
  final _amountCtrl = TextEditingController();
  int? _userId;
  bool _loading = false;

  @override
  void dispose() {
    _amountCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate() || _userId == null) return;
    setState(() => _loading = true);
    try {
      await apiClient.post('/vouchers', data: {
        'userId': _userId,
        'amount': double.parse(_amountCtrl.text.trim()),
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
    final customersAsync = ref.watch(_customersListProvider);

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Issue Voucher',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              customersAsync.when(
                data: (customers) => DropdownButtonFormField<int>(
                  value: _userId,
                  decoration: const InputDecoration(labelText: 'Customer'),
                  items: customers
                      .map((c) => DropdownMenuItem(
                          value: c.id,
                          child: Text('${c.name} (${c.email})')))
                      .toList(),
                  onChanged: (v) => setState(() => _userId = v),
                  validator: (_) => _userId == null ? 'Select customer' : null,
                ),
                loading: () => const CircularProgressIndicator(),
                error: (_, __) => const Text('Failed to load customers'),
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _amountCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Amount (EGP)'),
                validator: (v) => double.tryParse(v ?? '') == null ? 'Required' : null,
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
                      : const Text('Issue Voucher'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
