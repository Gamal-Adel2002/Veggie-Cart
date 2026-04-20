import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/theme.dart';
import '../../models/user.dart';
import '../../services/api_client.dart';
import '../../widgets/empty_state.dart';
import 'admin_shell.dart';

final _adminCustomersProvider = FutureProvider<List<AppUser>>((ref) async {
  final res = await apiClient.get('/admin/customers');
  return (res.data as List).map((e) => AppUser.fromJson(e)).toList();
});

class AdminCustomersScreen extends ConsumerStatefulWidget {
  const AdminCustomersScreen({super.key});

  @override
  ConsumerState<AdminCustomersScreen> createState() => _AdminCustomersScreenState();
}

class _AdminCustomersScreenState extends ConsumerState<AdminCustomersScreen> {
  String _search = '';

  @override
  Widget build(BuildContext context) {
    final customersAsync = ref.watch(_adminCustomersProvider);

    return Scaffold(
      appBar: AdminAppBar(title: 'Customers'),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              decoration: const InputDecoration(
                hintText: 'Search customers…',
                prefixIcon: Icon(Icons.search),
                filled: true,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.all(Radius.circular(12)),
                  borderSide: BorderSide.none,
                ),
                contentPadding: EdgeInsets.symmetric(vertical: 8),
              ),
              onChanged: (v) => setState(() => _search = v),
            ),
          ),
          Expanded(
            child: customersAsync.when(
              data: (customers) {
                final filtered = _search.isEmpty
                    ? customers
                    : customers
                        .where((c) =>
                            c.name.toLowerCase().contains(_search.toLowerCase()) ||
                            c.email.toLowerCase().contains(_search.toLowerCase()) ||
                            (c.phone?.contains(_search) ?? false))
                        .toList();
                return filtered.isEmpty
                    ? const EmptyState(message: 'No customers found')
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        itemCount: filtered.length,
                        itemBuilder: (_, i) {
                          final c = filtered[i];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: kPrimaryGreen.withOpacity(0.1),
                                child: Text(
                                  c.name.isNotEmpty ? c.name[0].toUpperCase() : 'C',
                                  style: const TextStyle(
                                      color: kPrimaryGreen,
                                      fontWeight: FontWeight.bold),
                                ),
                              ),
                              title: Text(c.name,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w600)),
                              subtitle: Text('${c.email}\n${c.phone ?? ''}'),
                              isThreeLine: true,
                              trailing: c.phone != null
                                  ? IconButton(
                                      icon: const Icon(Icons.phone,
                                          color: kPrimaryGreen),
                                      onPressed: () => launchUrl(
                                          Uri.parse('tel:${c.phone}')),
                                    )
                                  : null,
                            ),
                          );
                        },
                      );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Error: $e')),
            ),
          ),
        ],
      ),
    );
  }
}
