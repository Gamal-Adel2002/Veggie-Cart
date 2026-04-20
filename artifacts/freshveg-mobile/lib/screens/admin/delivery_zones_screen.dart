import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../config/theme.dart';
import '../../models/delivery_zone.dart';
import '../../services/api_client.dart';
import '../../widgets/empty_state.dart';
import 'admin_shell.dart';

final _zonesProvider = FutureProvider<List<DeliveryZone>>((ref) async {
  final res = await apiClient.get('/delivery-zones');
  return (res.data as List).map((e) => DeliveryZone.fromJson(e)).toList();
});

class DeliveryZonesScreen extends ConsumerStatefulWidget {
  const DeliveryZonesScreen({super.key});

  @override
  ConsumerState<DeliveryZonesScreen> createState() =>
      _DeliveryZonesScreenState();
}

class _DeliveryZonesScreenState extends ConsumerState<DeliveryZonesScreen>
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
        bottom: TabBar(
          controller: _tab,
          tabs: const [
            Tab(icon: Icon(Icons.list), text: 'List'),
            Tab(icon: Icon(Icons.map_outlined), text: 'Map'),
          ],
        ),
      ),
      body: zonesAsync.when(
        data: (zones) => TabBarView(
          controller: _tab,
          children: [
            _ZoneListView(zones: zones, onEdit: (z) => _openForm(context, ref, zone: z), onDelete: (id) => _delete(context, ref, id)),
            _ZoneMapView(zones: zones),
          ],
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
    final ok = await showDialog<bool>(
          context: context,
          builder: (_) => AlertDialog(
            title: const Text('Delete Zone'),
            content: const Text('This will remove the zone. Continue?'),
            actions: [
              TextButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  child: const Text('Cancel')),
              ElevatedButton(
                  onPressed: () => Navigator.of(context).pop(true),
                  style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red, foregroundColor: Colors.white),
                  child: const Text('Delete')),
            ],
          ),
        ) ??
        false;
    if (!ok) return;
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

class _ZoneListView extends StatelessWidget {
  final List<DeliveryZone> zones;
  final void Function(DeliveryZone) onEdit;
  final void Function(int) onDelete;

  const _ZoneListView(
      {required this.zones, required this.onEdit, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    if (zones.isEmpty) {
      return const EmptyState(
          message: 'No delivery zones configured', icon: Icons.map_outlined);
    }
    return ListView.builder(
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
                    ? kPrimaryGreen.withValues(alpha: 0.1)
                    : Colors.grey.shade100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(Icons.location_on,
                  color: z.active ? kPrimaryGreen : Colors.grey),
            ),
            title: Text(z.name,
                style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: Text(
                'Radius: ${z.radiusKm} km  •  Fee: EGP ${z.fee.toStringAsFixed(0)}  •  ${z.active ? 'Active' : 'Inactive'}'),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: const Icon(Icons.edit_outlined, size: 20),
                  onPressed: () => onEdit(z),
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline,
                      size: 20, color: Colors.red),
                  onPressed: () => onDelete(z.id),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _ZoneMapView extends StatefulWidget {
  final List<DeliveryZone> zones;

  const _ZoneMapView({required this.zones});

  @override
  State<_ZoneMapView> createState() => _ZoneMapViewState();
}

class _ZoneMapViewState extends State<_ZoneMapView> {
  Set<Circle> _buildCircles() {
    final colors = [
      Colors.green,
      Colors.blue,
      Colors.orange,
      Colors.purple,
      Colors.red,
    ];
    return widget.zones.asMap().entries.map((e) {
      final idx = e.key;
      final z = e.value;
      final color = colors[idx % colors.length];
      return Circle(
        circleId: CircleId('zone_${z.id}'),
        center: LatLng(z.centerLat, z.centerLng),
        radius: z.radiusKm * 1000,
        fillColor: color.withValues(alpha: 0.15),
        strokeColor: color.withValues(alpha: 0.6),
        strokeWidth: 2,
      );
    }).toSet();
  }

  Set<Marker> _buildMarkers() {
    return widget.zones.map((z) => Marker(
          markerId: MarkerId('marker_${z.id}'),
          position: LatLng(z.centerLat, z.centerLng),
          infoWindow: InfoWindow(
            title: z.name,
            snippet: 'R: ${z.radiusKm} km  |  Fee: EGP ${z.fee.toStringAsFixed(0)}',
          ),
        )).toSet();
  }

  LatLng _computeCenter() {
    if (widget.zones.isEmpty) return const LatLng(30.0444, 31.2357);
    final lat = widget.zones.map((z) => z.centerLat).reduce((a, b) => a + b) /
        widget.zones.length;
    final lng = widget.zones.map((z) => z.centerLng).reduce((a, b) => a + b) /
        widget.zones.length;
    return LatLng(lat, lng);
  }

  @override
  Widget build(BuildContext context) {
    if (widget.zones.isEmpty) {
      return const EmptyState(
          message: 'No zones to display on the map', icon: Icons.map_outlined);
    }
    return GoogleMap(
      initialCameraPosition: CameraPosition(
        target: _computeCenter(),
        zoom: 10,
      ),
      circles: _buildCircles(),
      markers: _buildMarkers(),
      myLocationButtonEnabled: false,
    );
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
  late final _nameCtrl =
      TextEditingController(text: widget.zone?.name ?? '');
  late final _radiusCtrl = TextEditingController(
      text: widget.zone?.radiusKm.toString() ?? '5');
  late final _feeCtrl = TextEditingController(
      text: widget.zone?.fee.toString() ?? '30');
  bool _active = true;
  bool _loading = false;
  LatLng? _center;
  bool _showMap = false;

  @override
  void initState() {
    super.initState();
    _active = widget.zone?.active ?? true;
    if (widget.zone != null) {
      _center = LatLng(widget.zone!.centerLat, widget.zone!.centerLng);
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _radiusCtrl.dispose();
    _feeCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_center == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a center on the map')),
      );
      return;
    }
    setState(() => _loading = true);
    try {
      final data = {
        'name': _nameCtrl.text.trim(),
        'centerLat': _center!.latitude,
        'centerLng': _center!.longitude,
        'radiusKm': double.parse(_radiusCtrl.text.trim()),
        'fee': double.parse(_feeCtrl.text.trim()),
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
      padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(widget.zone == null ? 'Add Zone' : 'Edit Zone',
                      style: const TextStyle(
                          fontSize: 18, fontWeight: FontWeight.bold)),
                  IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.of(context).pop()),
                ],
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _nameCtrl,
                decoration: const InputDecoration(labelText: 'Zone Name'),
                validator: (v) =>
                    v?.isEmpty == true ? 'Required' : null,
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _radiusCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Radius (km)'),
                      validator: (v) =>
                          double.tryParse(v ?? '') == null ? 'Invalid' : null,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextFormField(
                      controller: _feeCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Fee (EGP)'),
                      validator: (v) =>
                          double.tryParse(v ?? '') == null ? 'Invalid' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              OutlinedButton.icon(
                icon: const Icon(Icons.map_outlined),
                label: Text(_center == null
                    ? 'Set Center on Map'
                    : 'Center: ${_center!.latitude.toStringAsFixed(4)}, ${_center!.longitude.toStringAsFixed(4)}'),
                onPressed: () =>
                    setState(() => _showMap = !_showMap),
              ),
              if (_showMap) ...[
                const SizedBox(height: 8),
                SizedBox(
                  height: 220,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: GoogleMap(
                      initialCameraPosition: CameraPosition(
                        target: _center ?? const LatLng(30.0444, 31.2357),
                        zoom: 10,
                      ),
                      onTap: (pos) {
                        setState(() {
                          _center = pos;
                          _showMap = false;
                        });
                      },
                      circles: _center != null
                          ? {
                              Circle(
                                circleId: const CircleId('preview'),
                                center: _center!,
                                radius: (double.tryParse(_radiusCtrl.text) ??
                                        5) *
                                    1000,
                                fillColor: kPrimaryGreen.withValues(alpha: 0.2),
                                strokeColor:
                                    kPrimaryGreen.withValues(alpha: 0.7),
                                strokeWidth: 2,
                              ),
                            }
                          : {},
                      markers: _center != null
                          ? {
                              Marker(
                                markerId: const MarkerId('center'),
                                position: _center!,
                              )
                            }
                          : {},
                    ),
                  ),
                ),
              ],
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
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
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
