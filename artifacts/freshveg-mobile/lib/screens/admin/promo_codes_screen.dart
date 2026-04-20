import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../config/theme.dart';
import '../../models/promo.dart';
import '../../services/api_client.dart';
import '../../widgets/empty_state.dart';
import 'admin_shell.dart';

final _promoCodesProvider = FutureProvider<List<PromoCode>>((ref) async {
  final res = await apiClient.get('/promo-codes');
  return (res.data as List).map((e) => PromoCode.fromJson(e)).toList();
});

class PromoCodesScreen extends ConsumerWidget {
  const PromoCodesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final promosAsync = ref.watch(_promoCodesProvider);

    return Scaffold(
      appBar: AdminAppBar(
        title: 'Promo Codes',
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _openForm(context, ref),
          ),
        ],
      ),
      body: promosAsync.when(
        data: (promos) => promos.isEmpty
            ? const EmptyState(message: 'No promo codes', icon: Icons.local_offer_outlined)
            : ListView.builder(
                padding: const EdgeInsets.all(12),
                itemCount: promos.length,
                itemBuilder: (_, i) {
                  final p = promos[i];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: p.active
                              ? kPrimaryGreen.withOpacity(0.1)
                              : Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(p.code,
                            style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: p.active ? kPrimaryGreen : Colors.grey,
                                fontSize: 12)),
                      ),
                      title: Text(
                          '${p.discountType == 'percentage' ? '${p.discountValue.toStringAsFixed(0)}%' : 'EGP ${p.discountValue.toStringAsFixed(0)}'} off'),
                      subtitle: Text(
                          'Used: ${p.usedCount}${p.maxUses != null ? '/${p.maxUses}' : ''}  •  ${p.active ? 'Active' : 'Inactive'}'),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Switch(
                            value: p.active,
                            onChanged: (v) => _toggleActive(context, ref, p.id, v),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline,
                                size: 20, color: Colors.red),
                            onPressed: () => _delete(context, ref, p.id),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }

  Future<void> _toggleActive(BuildContext context, WidgetRef ref, int id, bool active) async {
    try {
      await apiClient.patch('/promo-codes/$id', data: {'active': active});
      ref.invalidate(_promoCodesProvider);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _delete(BuildContext context, WidgetRef ref, int id) async {
    try {
      await apiClient.delete('/promo-codes/$id');
      ref.invalidate(_promoCodesProvider);
    } catch (_) {}
  }

  void _openForm(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _PromoForm(
        onSaved: () {
          ref.invalidate(_promoCodesProvider);
          Navigator.of(context).pop();
        },
      ),
    );
  }
}

class _DatePickerTile extends StatelessWidget {
  final String label;
  final String value;
  final VoidCallback onTap;

  const _DatePickerTile(
      {required this.label, required this.value, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey.shade300),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label,
                style: const TextStyle(fontSize: 11, color: Colors.grey)),
            const SizedBox(height: 2),
            Row(
              children: [
                const Icon(Icons.calendar_today_outlined,
                    size: 14, color: Colors.grey),
                const SizedBox(width: 6),
                Text(value,
                    style: const TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w500)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _PromoForm extends StatefulWidget {
  final VoidCallback onSaved;

  const _PromoForm({required this.onSaved});

  @override
  State<_PromoForm> createState() => _PromoFormState();
}

class _PromoFormState extends State<_PromoForm> {
  final _formKey = GlobalKey<FormState>();
  final _codeCtrl = TextEditingController();
  final _valueCtrl = TextEditingController();
  final _maxUsesCtrl = TextEditingController();
  String _discountType = 'percentage';
  DateTime? _validFrom;
  DateTime? _validUntil;
  bool _loading = false;

  @override
  void dispose() {
    _codeCtrl.dispose(); _valueCtrl.dispose(); _maxUsesCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate({required bool isFrom}) async {
    final now = DateTime.now();
    final initial = isFrom
        ? (_validFrom ?? now)
        : (_validUntil ?? (_validFrom ?? now).add(const Duration(days: 30)));
    final first = isFrom ? now : (_validFrom ?? now);

    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: first,
      lastDate: DateTime(2030),
    );
    if (picked == null) return;
    setState(() {
      if (isFrom) {
        _validFrom = picked;
        if (_validUntil != null && _validUntil!.isBefore(picked)) {
          _validUntil = null;
        }
      } else {
        _validUntil = picked;
      }
    });
  }

  String _fmt(DateTime? d) {
    if (d == null) return 'Not set';
    return '${d.day}/${d.month}/${d.year}';
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      await apiClient.post('/promo-codes', data: {
        'code': _codeCtrl.text.trim().toUpperCase(),
        'discountType': _discountType,
        'discountValue': double.parse(_valueCtrl.text.trim()),
        'maxUses': _maxUsesCtrl.text.isNotEmpty
            ? int.tryParse(_maxUsesCtrl.text.trim())
            : null,
        'active': true,
        if (_validFrom != null) 'validFrom': _validFrom!.toIso8601String(),
        if (_validUntil != null) 'validUntil': _validUntil!.toIso8601String(),
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
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Add Promo Code',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              TextFormField(
                controller: _codeCtrl,
                decoration: const InputDecoration(labelText: 'Code'),
                textCapitalization: TextCapitalization.characters,
                validator: (v) => v?.isEmpty == true ? 'Required' : null,
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                value: _discountType,
                decoration: const InputDecoration(labelText: 'Type'),
                items: const [
                  DropdownMenuItem(value: 'percentage', child: Text('Percentage')),
                  DropdownMenuItem(value: 'fixed', child: Text('Fixed Amount')),
                ],
                onChanged: (v) => setState(() => _discountType = v!),
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _valueCtrl,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: _discountType == 'percentage' ? 'Discount %' : 'Amount (EGP)',
                ),
                validator: (v) => double.tryParse(v ?? '') == null ? 'Required' : null,
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _maxUsesCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Max Uses (optional)'),
              ),
              const SizedBox(height: 12),
              // Date range pickers
              Row(
                children: [
                  Expanded(
                    child: _DatePickerTile(
                      label: 'Valid From',
                      value: _fmt(_validFrom),
                      onTap: () => _pickDate(isFrom: true),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _DatePickerTile(
                      label: 'Valid Until',
                      value: _fmt(_validUntil),
                      onTap: () => _pickDate(isFrom: false),
                    ),
                  ),
                ],
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
                      : const Text('Add Promo Code'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

