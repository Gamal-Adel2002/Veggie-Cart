import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../config/theme.dart';
import '../../services/api_client.dart';
import 'admin_shell.dart';

class StoreHoursScreen extends ConsumerStatefulWidget {
  const StoreHoursScreen({super.key});

  @override
  ConsumerState<StoreHoursScreen> createState() => _StoreHoursScreenState();
}

class _StoreHoursScreenState extends ConsumerState<StoreHoursScreen> {
  static const _days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  Map<String, Map<String, dynamic>> _hours = {};
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await apiClient.get('/store/hours');
      final list = res.data as List<dynamic>;
      setState(() {
        _hours = {};
        for (final item in list) {
          final day = item['dayOfWeek'] as String;
          _hours[day] = Map<String, dynamic>.from(item as Map);
        }
        for (final d in _days) {
          if (!_hours.containsKey(d)) {
            _hours[d] = {'dayOfWeek': d, 'openTime': '08:00', 'closeTime': '22:00', 'closed': false};
          }
        }
      });
    } catch (_) {}
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await apiClient.put('/store/hours', data: _hours.values.toList());
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Store hours saved')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _pickTime(String day, String field) async {
    final current = _hours[day]?[field] as String? ?? '08:00';
    final parts = current.split(':');
    final initial = TimeOfDay(
        hour: int.tryParse(parts[0]) ?? 8,
        minute: int.tryParse(parts[1]) ?? 0);
    final picked =
        await showTimePicker(context: context, initialTime: initial);
    if (picked != null) {
      setState(() {
        _hours[day]![field] =
            '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AdminAppBar(
        title: 'Store Hours',
        actions: [
          TextButton(
            onPressed: _saving ? null : _save,
            child: _saving
                ? const SizedBox(
                    width: 16, height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Save', style: TextStyle(color: kPrimaryGreen)),
          ),
        ],
      ),
      body: _hours.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _days.length,
              itemBuilder: (_, i) {
                final day = _days[i];
                final h = _hours[day] ?? {};
                final closed = h['closed'] as bool? ?? false;

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
                            Text(day,
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold, fontSize: 15)),
                            Row(
                              children: [
                                const Text('Closed', style: TextStyle(fontSize: 13)),
                                const SizedBox(width: 4),
                                Switch(
                                  value: closed,
                                  onChanged: (v) =>
                                      setState(() => _hours[day]!['closed'] = v),
                                ),
                              ],
                            ),
                          ],
                        ),
                        if (!closed) ...[
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Opens',
                                        style: TextStyle(
                                            color: Colors.grey, fontSize: 12)),
                                    const SizedBox(height: 4),
                                    InkWell(
                                      onTap: () => _pickTime(day, 'openTime'),
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 12, vertical: 10),
                                        decoration: BoxDecoration(
                                          border: Border.all(
                                              color: Colors.grey.shade300),
                                          borderRadius:
                                              BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                            h['openTime'] as String? ??
                                                '08:00',
                                            style: const TextStyle(
                                                fontWeight: FontWeight.w600)),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Closes',
                                        style: TextStyle(
                                            color: Colors.grey, fontSize: 12)),
                                    const SizedBox(height: 4),
                                    InkWell(
                                      onTap: () => _pickTime(day, 'closeTime'),
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 12, vertical: 10),
                                        decoration: BoxDecoration(
                                          border: Border.all(
                                              color: Colors.grey.shade300),
                                          borderRadius:
                                              BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                            h['closeTime'] as String? ??
                                                '22:00',
                                            style: const TextStyle(
                                                fontWeight: FontWeight.w600)),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}
