import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/theme.dart';
import '../../models/supplier.dart';
import '../../services/api_client.dart';
import '../../widgets/empty_state.dart';
import 'admin_shell.dart';

final _suppliersProvider = FutureProvider<List<Supplier>>((ref) async {
  final res = await apiClient.get('/suppliers');
  return (res.data as List).map((e) => Supplier.fromJson(e)).toList();
});

class SuppliersScreen extends ConsumerWidget {
  const SuppliersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final suppliersAsync = ref.watch(_suppliersProvider);

    return Scaffold(
      appBar: AdminAppBar(
        title: 'Suppliers',
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _openForm(context, ref),
          ),
        ],
      ),
      body: suppliersAsync.when(
        data: (suppliers) => suppliers.isEmpty
            ? const EmptyState(message: 'No suppliers added', icon: Icons.local_shipping_outlined)
            : ListView.builder(
                padding: const EdgeInsets.all(12),
                itemCount: suppliers.length,
                itemBuilder: (_, i) {
                  final s = suppliers[i];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: kPrimaryGreen.withOpacity(0.1),
                        child: const Icon(Icons.store, color: kPrimaryGreen),
                      ),
                      title: Text(s.name,
                          style: const TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: Text(s.phone ?? 'No phone'),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (s.phone != null)
                            IconButton(
                              icon: const Icon(Icons.phone, color: kPrimaryGreen, size: 20),
                              onPressed: () => launchUrl(Uri.parse('tel:${s.phone}')),
                            ),
                          IconButton(
                            icon: const Icon(Icons.edit_outlined, size: 20),
                            onPressed: () => _openForm(context, ref, supplier: s),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline, size: 20, color: Colors.red),
                            onPressed: () => _delete(context, ref, s.id),
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

  void _openForm(BuildContext context, WidgetRef ref, {Supplier? supplier}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _SupplierForm(
        supplier: supplier,
        onSaved: () {
          ref.invalidate(_suppliersProvider);
          Navigator.of(context).pop();
        },
      ),
    );
  }

  Future<void> _delete(BuildContext context, WidgetRef ref, int id) async {
    try {
      await apiClient.delete('/suppliers/$id');
      ref.invalidate(_suppliersProvider);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }
}

class _SupplierForm extends StatefulWidget {
  final Supplier? supplier;
  final VoidCallback onSaved;

  const _SupplierForm({this.supplier, required this.onSaved});

  @override
  State<_SupplierForm> createState() => _SupplierFormState();
}

class _SupplierFormState extends State<_SupplierForm> {
  final _formKey = GlobalKey<FormState>();
  late final _nameCtrl = TextEditingController(text: widget.supplier?.name ?? '');
  late final _phoneCtrl = TextEditingController(text: widget.supplier?.phone ?? '');
  late final _notesCtrl = TextEditingController(text: widget.supplier?.notes ?? '');
  bool _loading = false;

  @override
  void dispose() {
    _nameCtrl.dispose(); _phoneCtrl.dispose(); _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      final data = {
        'name': _nameCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'notes': _notesCtrl.text.trim(),
      };
      if (widget.supplier != null) {
        await apiClient.put('/suppliers/${widget.supplier!.id}', data: data);
      } else {
        await apiClient.post('/suppliers', data: data);
      }
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
              Text(widget.supplier == null ? 'Add Supplier' : 'Edit Supplier',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              TextFormField(
                controller: _nameCtrl,
                decoration: const InputDecoration(labelText: 'Supplier Name'),
                validator: (v) => v?.isEmpty == true ? 'Required' : null,
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _phoneCtrl,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Phone'),
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _notesCtrl,
                decoration: const InputDecoration(labelText: 'Notes'),
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
                      : Text(widget.supplier == null ? 'Add Supplier' : 'Save'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
