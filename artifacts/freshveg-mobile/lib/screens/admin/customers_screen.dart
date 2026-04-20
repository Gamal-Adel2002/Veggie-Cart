import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/theme.dart';
import '../../models/user.dart';
import '../../services/api_client.dart';
import '../../widgets/empty_state.dart';
import 'admin_shell.dart';

final _adminCustomersProvider =
    FutureProvider.autoDispose<List<AppUser>>((ref) async {
  final res = await apiClient.get('/admin/customers');
  return (res.data as List).map((e) => AppUser.fromJson(e)).toList();
});

class AdminCustomersScreen extends ConsumerStatefulWidget {
  const AdminCustomersScreen({super.key});

  @override
  ConsumerState<AdminCustomersScreen> createState() =>
      _AdminCustomersScreenState();
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
                            c.name
                                .toLowerCase()
                                .contains(_search.toLowerCase()) ||
                            c.email
                                .toLowerCase()
                                .contains(_search.toLowerCase()) ||
                            (c.phone?.contains(_search) ?? false))
                        .toList();
                return filtered.isEmpty
                    ? const EmptyState(message: 'No customers found')
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        itemCount: filtered.length,
                        itemBuilder: (_, i) {
                          final c = filtered[i];
                          return _CustomerCard(
                            customer: c,
                            onChanged: () =>
                                ref.invalidate(_adminCustomersProvider),
                          );
                        },
                      );
              },
              loading: () =>
                  const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Error: $e')),
            ),
          ),
        ],
      ),
    );
  }
}

class _CustomerCard extends StatelessWidget {
  final AppUser customer;
  final VoidCallback onChanged;

  const _CustomerCard({required this.customer, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: kPrimaryGreen.withValues(alpha: 0.1),
          child: Text(
            customer.name.isNotEmpty
                ? customer.name[0].toUpperCase()
                : 'C',
            style: const TextStyle(
                color: kPrimaryGreen, fontWeight: FontWeight.bold),
          ),
        ),
        title: Text(customer.name,
            style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(customer.email, style: const TextStyle(fontSize: 12)),
        trailing: const Icon(Icons.chevron_right, color: Colors.grey),
        onTap: () => _showProfileSheet(context),
      ),
    );
  }

  void _showProfileSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _CustomerProfileSheet(
        customer: customer,
        onChanged: onChanged,
      ),
    );
  }
}

class _CustomerProfileSheet extends StatefulWidget {
  final AppUser customer;
  final VoidCallback onChanged;

  const _CustomerProfileSheet(
      {required this.customer, required this.onChanged});

  @override
  State<_CustomerProfileSheet> createState() => _CustomerProfileSheetState();
}

class _CustomerProfileSheetState extends State<_CustomerProfileSheet> {
  bool _resettingPassword = false;
  bool _toggling = false;

  Future<void> _resetPassword() async {
    final ok = await showDialog<bool>(
          context: context,
          builder: (_) => AlertDialog(
            title: const Text('Reset Password'),
            content: Text(
                'Send a password reset link to ${widget.customer.email}?'),
            actions: [
              TextButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  child: const Text('Cancel')),
              ElevatedButton(
                  onPressed: () => Navigator.of(context).pop(true),
                  child: const Text('Send Reset Link')),
            ],
          ),
        ) ??
        false;
    if (!ok || !mounted) return;
    setState(() => _resettingPassword = true);
    try {
      await apiClient.post('/admin/customers/${widget.customer.id}/reset-password');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('Password reset link sent'),
            backgroundColor: kPrimaryGreen));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('Failed: $e'), backgroundColor: Colors.red));
      }
    } finally {
      if (mounted) setState(() => _resettingPassword = false);
    }
  }

  Future<void> _toggleActive() async {
    setState(() => _toggling = true);
    try {
      await apiClient.patch('/admin/customers/${widget.customer.id}',
          data: {'active': !(widget.customer.active ?? true)});
      widget.onChanged();
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('Failed: $e'), backgroundColor: Colors.red));
      }
    } finally {
      if (mounted) setState(() => _toggling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.customer;
    final initials =
        c.name.isNotEmpty ? c.name[0].toUpperCase() : 'C';

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.6,
      maxChildSize: 0.9,
      builder: (_, controller) => ListView(
        controller: controller,
        padding: const EdgeInsets.all(24),
        children: [
          // Header
          Row(
            children: [
              CircleAvatar(
                radius: 32,
                backgroundColor: kPrimaryGreen.withValues(alpha: 0.12),
                child: Text(
                  initials,
                  style: const TextStyle(
                      color: kPrimaryGreen,
                      fontSize: 24,
                      fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(c.name,
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 18)),
                    Text(c.email,
                        style: const TextStyle(color: Colors.grey)),
                    if (c.phone != null)
                      Text(c.phone!,
                          style: const TextStyle(color: Colors.grey)),
                  ],
                ),
              ),
            ],
          ),
          const Divider(height: 32),

          // Info rows
          _InfoRow(Icons.email_outlined, 'Email', c.email),
          if (c.phone != null)
            _InfoRow(Icons.phone_outlined, 'Phone', c.phone!),
          _InfoRow(Icons.circle, 'Status',
              (c.active ?? true) ? 'Active' : 'Suspended',
              valueColor: (c.active ?? true) ? Colors.green : Colors.red),

          const SizedBox(height: 24),

          // Actions
          ListTile(
            leading: const Icon(Icons.phone, color: kPrimaryGreen),
            title: const Text('Call Customer'),
            enabled: c.phone != null,
            onTap: c.phone != null
                ? () => launchUrl(Uri.parse('tel:${c.phone}'))
                : null,
          ),
          ListTile(
            leading: const Icon(Icons.lock_reset, color: Colors.orange),
            title: const Text('Reset Password'),
            subtitle: const Text('Send email reset link'),
            trailing: _resettingPassword
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : null,
            onTap: _resettingPassword ? null : _resetPassword,
          ),
          ListTile(
            leading: Icon(
              (c.active ?? true) ? Icons.block : Icons.check_circle,
              color: (c.active ?? true) ? Colors.red : Colors.green,
            ),
            title: Text(
                (c.active ?? true) ? 'Suspend Account' : 'Reactivate Account'),
            trailing: _toggling
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : null,
            onTap: _toggling ? null : _toggleActive,
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;

  const _InfoRow(this.icon, this.label, this.value, {this.valueColor});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 18, color: Colors.grey),
          const SizedBox(width: 10),
          Text('$label: ',
              style: const TextStyle(color: Colors.grey, fontSize: 13)),
          Expanded(
            child: Text(value,
                style: TextStyle(
                    fontWeight: FontWeight.w500,
                    color: valueColor,
                    fontSize: 13)),
          ),
        ],
      ),
    );
  }
}
