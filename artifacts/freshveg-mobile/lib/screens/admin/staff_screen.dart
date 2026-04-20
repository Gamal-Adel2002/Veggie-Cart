import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/user.dart';
import '../../services/api_client.dart';
import '../../widgets/empty_state.dart';
import 'admin_shell.dart';

final _staffProvider = FutureProvider.autoDispose<List<AppUser>>((ref) async {
  final res = await apiClient.get('/admin/staff');
  return (res.data as List).map((e) => AppUser.fromJson(e)).toList();
});

class StaffScreen extends ConsumerStatefulWidget {
  const StaffScreen({super.key});

  @override
  ConsumerState<StaffScreen> createState() => _StaffScreenState();
}

class _StaffScreenState extends ConsumerState<StaffScreen>
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
    final staffAsync = ref.watch(_staffProvider);

    return Scaffold(
      appBar: AdminAppBar(
        title: 'Staff',
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _openForm(context, ref),
          ),
        ],
        bottom: TabBar(
          controller: _tab,
          tabs: const [
            Tab(
                icon: Icon(Icons.delivery_dining, size: 18),
                text: 'Delivery'),
            Tab(
                icon: Icon(Icons.admin_panel_settings, size: 18),
                text: 'Admins'),
          ],
        ),
      ),
      body: staffAsync.when(
        data: (staff) {
          final delivery =
              staff.where((s) => s.role == 'delivery').toList();
          final admins = staff.where((s) => s.role == 'admin').toList();

          return TabBarView(
            controller: _tab,
            children: [
              _StaffTab(
                members: delivery,
                role: 'delivery',
                emptyMessage: 'No delivery staff yet',
                emptyIcon: Icons.delivery_dining_outlined,
                onChanged: () => ref.invalidate(_staffProvider),
              ),
              _StaffTab(
                members: admins,
                role: 'admin',
                emptyMessage: 'No admin accounts yet',
                emptyIcon: Icons.admin_panel_settings_outlined,
                onChanged: () => ref.invalidate(_staffProvider),
              ),
            ],
          );
        },
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
      builder: (_) => _StaffForm(
        initialRole: _tab.index == 0 ? 'delivery' : 'admin',
        onSaved: () {
          ref.invalidate(_staffProvider);
          Navigator.of(context).pop();
        },
      ),
    );
  }
}

class _StaffTab extends StatelessWidget {
  final List<AppUser> members;
  final String role;
  final String emptyMessage;
  final IconData emptyIcon;
  final VoidCallback onChanged;

  const _StaffTab({
    required this.members,
    required this.role,
    required this.emptyMessage,
    required this.emptyIcon,
    required this.onChanged,
  });

  Color get _roleColor =>
      role == 'admin' ? Colors.purple : Colors.blue;

  @override
  Widget build(BuildContext context) {
    if (members.isEmpty) {
      return EmptyState(message: emptyMessage, icon: emptyIcon);
    }
    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: members.length,
      itemBuilder: (_, i) {
        final s = members[i];
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: _roleColor.withValues(alpha: 0.1),
              child: Icon(
                role == 'admin'
                    ? Icons.admin_panel_settings
                    : Icons.delivery_dining,
                color: _roleColor,
              ),
            ),
            title: Text(s.name,
                style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: Text('${s.email}\n${s.phone ?? ''}'),
            isThreeLine: s.phone != null,
            trailing: IconButton(
              icon: const Icon(Icons.delete_outline, color: Colors.red),
              onPressed: () => _confirmRemove(context, s),
            ),
          ),
        );
      },
    );
  }

  Future<void> _confirmRemove(BuildContext context, AppUser s) async {
    final ok = await showDialog<bool>(
          context: context,
          builder: (_) => AlertDialog(
            title: const Text('Remove Staff Member'),
            content: Text(
                'Remove ${s.name} from staff? This cannot be undone.'),
            actions: [
              TextButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  child: const Text('Cancel')),
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                onPressed: () => Navigator.of(context).pop(true),
                child: const Text('Remove',
                    style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
        ) ??
        false;
    if (!ok || !context.mounted) return;
    try {
      await apiClient.delete('/admin/staff/${s.id}');
      onChanged();
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('Error: $e'), backgroundColor: Colors.red));
      }
    }
  }
}

class _StaffForm extends StatefulWidget {
  final VoidCallback onSaved;
  final String initialRole;

  const _StaffForm({required this.onSaved, required this.initialRole});

  @override
  State<_StaffForm> createState() => _StaffFormState();
}

class _StaffFormState extends State<_StaffForm> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  late String _role;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _role = widget.initialRole;
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      await apiClient.post('/admin/staff', data: {
        'name': _nameCtrl.text.trim(),
        'email': _emailCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'password': _passCtrl.text.trim(),
        'role': _role,
      });
      widget.onSaved();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding:
          EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _role == 'delivery'
                    ? 'Add Delivery Driver'
                    : 'Add Admin Account',
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              TextFormField(
                controller: _nameCtrl,
                decoration: const InputDecoration(labelText: 'Full Name'),
                validator: (v) => v?.isEmpty == true ? 'Required' : null,
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: 'Email'),
                validator: (v) =>
                    v?.contains('@') == false ? 'Invalid email' : null,
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _phoneCtrl,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Phone'),
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _passCtrl,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Password'),
                validator: (v) =>
                    (v?.length ?? 0) < 6 ? 'Min 6 chars' : null,
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                value: _role,
                decoration: const InputDecoration(labelText: 'Role'),
                items: const [
                  DropdownMenuItem(
                      value: 'delivery',
                      child: Row(
                        children: [
                          Icon(Icons.delivery_dining, color: Colors.blue),
                          SizedBox(width: 8),
                          Text('Delivery Driver'),
                        ],
                      )),
                  DropdownMenuItem(
                      value: 'admin',
                      child: Row(
                        children: [
                          Icon(Icons.admin_panel_settings,
                              color: Colors.purple),
                          SizedBox(width: 8),
                          Text('Admin'),
                        ],
                      )),
                ],
                onChanged: (v) => setState(() => _role = v!),
              ),
              const SizedBox(height: 20),
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
                      : const Text('Add Staff Member'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
