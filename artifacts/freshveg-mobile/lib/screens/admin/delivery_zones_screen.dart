import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../config/theme.dart';
import '../../models/delivery_zone.dart';
import '../../services/api_client.dart';
import '../../widgets/empty_state.dart';
import 'admin_shell.dart';

final _zonesProvider = FutureProvider<List<DeliveryZone>>((ref) async {
  final res = await apiClient.get('/delivery-zones');
  return (res.data as List).map((e) => DeliveryZone.fromJson(e)).toList();
});

class DeliveryZonesScreen extends ConsumerWidget {
  const DeliveryZonesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final zonesAsync = ref.watch(_zonesProvider);

    return Scaffold(
      appBar: AdminAppBar(
        title: 'Delivery Zones',
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _openForm(context, ref),
          ),
        ],
      ),
      body: zonesAsync.when(
        data: (zones) => zones.isEmpty
            ? const EmptyState(
                message: 'No delivery zones configured',
                icon: Icons.map_outlined)
            : ListView.builder(
                padding: const EdgeInsets.all(12),
                itemCount: zones.length,
                itemBuilder: (_, i) {
                  final z = zones[i];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: z.active
                              ? kPrimaryGreen.withOpacity(0.1)
                              : Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(Icons.location_on,
                            color: z.active ? kPrimaryGreen : Colors.grey),
                      ),
                      title: Text(z.name,
                          style: const TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: Text(
                          'Radius: ${z.radiusKm} km  •  ${z.active ? 'Active' : 'Inactive'}'),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.edit_outlined, size: 20),
                            onPressed: () => _openForm(context, ref, zone: z),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline,
                                size: 20, color: Colors.red),
                            onPressed: () => _delete(context, ref, z.id),
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

  void _openForm(BuildContext context, WidgetRef ref, {DeliveryZone? zone}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _ZoneForm(
        zone: zone,
        onSaved: () {
          ref.invalidate(_zonesProvider);
          Navigator.of(context).pop();
        },
      ),
    );
  }

  Future<void> _delete(BuildContext context, WidgetRef ref, int id) async {
    try {
      await apiClient.delete('/delivery-zones/$id');
      ref.invalidate(_zonesProvider);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }
}

class _ZoneForm extends StatefulWidget {
  final DeliveryZone? zone;
  final VoidCallback onSaved;

  const _ZoneForm({this.zone, required this.onSaved});

  @override
  State<_ZoneForm> createState() => _ZoneFormState();
}

class _ZoneFormState extends State<_ZoneForm> {
  final _formKey = GlobalKey<FormState>();
  late final _nameCtrl = TextEditingController(text: widget.zone?.name ?? '');
  late final _latCtrl = TextEditingController(text: widget.zone?.centerLat.toString() ?? '30.0444');
  late final _lngCtrl = TextEditingController(text: widget.zone?.centerLng.toString() ?? '31.2357');
  late final _radiusCtrl = TextEditingController(text: widget.zone?.radiusKm.toString() ?? '5');
  bool _active = true;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _active = widget.zone?.active ?? true;
  }

  @override
  void dispose() {
    _nameCtrl.dispose(); _latCtrl.dispose(); _lngCtrl.dispose(); _radiusCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      final data = {
        'name': _nameCtrl.text.trim(),
        'centerLat': double.parse(_latCtrl.text.trim()),
        'centerLng': double.parse(_lngCtrl.text.trim()),
        'radiusKm': double.parse(_radiusCtrl.text.trim()),
        'active': _active,
      };
      if (widget.zone != null) {
        await apiClient.put('/delivery-zones/${widget.zone!.id}', data: data);
      } else {
        await apiClient.post('/delivery-zones', data: data);
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
              Text(widget.zone == null ? 'Add Zone' : 'Edit Zone',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              TextFormField(
                controller: _nameCtrl,
                decoration: const InputDecoration(labelText: 'Zone Name'),
                validator: (v) => v?.isEmpty == true ? 'Required' : null,
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _latCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Center Lat'),
                      validator: (v) => double.tryParse(v ?? '') == null ? 'Invalid' : null,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextFormField(
                      controller: _lngCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Center Lng'),
                      validator: (v) => double.tryParse(v ?? '') == null ? 'Invalid' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _radiusCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Radius (km)'),
                validator: (v) => double.tryParse(v ?? '') == null ? 'Invalid' : null,
              ),
              const SizedBox(height: 10),
              SwitchListTile(
                title: const Text('Active'),
                value: _active,
                onChanged: (v) => setState(() => _active = v),
                contentPadding: EdgeInsets.zero,
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _loading ? null : _save,
                  child: _loading
                      ? const SizedBox(
                          height: 20, width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text(widget.zone == null ? 'Add Zone' : 'Save'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
