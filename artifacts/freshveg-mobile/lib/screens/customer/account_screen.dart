import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../config/theme.dart';
import '../../models/order.dart';
import '../../models/user.dart';
import '../../providers/auth_provider.dart';
import '../../providers/locale_provider.dart';
import '../../app.dart';
import '../../services/api_client.dart';
import '../../widgets/order_status_badge.dart';
import '../../widgets/empty_state.dart';

final _myOrdersProvider = FutureProvider<List<Order>>((ref) async {
  final res = await apiClient.get('/orders/my');
  return (res.data as List).map((e) => Order.fromJson(e)).toList();
});

class AccountScreen extends ConsumerStatefulWidget {
  const AccountScreen({super.key});

  @override
  ConsumerState<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends ConsumerState<AccountScreen>
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
    final auth = ref.watch(authProvider);
    final locale = ref.watch(localeProvider);
    final themeMode = ref.watch(themeModeProvider);

    if (!auth.isLoggedIn) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.person_outline, size: 72, color: Colors.grey),
              const SizedBox(height: 16),
              const Text('Sign in to view your account',
                  style: TextStyle(fontSize: 16, color: Colors.grey)),
              const SizedBox(height: 24),
              ElevatedButton(
                  onPressed: () => context.go('/login'),
                  child: const Text('Sign In')),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Account'),
        bottom: TabBar(
          controller: _tab,
          tabs: const [
            Tab(text: 'Profile'),
            Tab(text: 'My Orders'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tab,
        children: [
          _ProfileTab(locale: locale, themeMode: themeMode),
          const _OrdersTab(),
        ],
      ),
    );
  }
}

class _ProfileTab extends ConsumerStatefulWidget {
  final dynamic locale;
  final dynamic themeMode;

  const _ProfileTab({required this.locale, required this.themeMode});

  @override
  ConsumerState<_ProfileTab> createState() => _ProfileTabState();
}

class _ProfileTabState extends ConsumerState<_ProfileTab> {
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  bool _editing = false;
  bool _saving = false;
  XFile? _pickedImage;

  @override
  void initState() {
    super.initState();
    final user = ref.read(authProvider).user;
    if (user != null) {
      _nameCtrl.text = user.name;
      _phoneCtrl.text = user.phone ?? '';
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
        source: ImageSource.gallery, maxWidth: 800, imageQuality: 80);
    if (picked != null) setState(() => _pickedImage = picked);
  }

  Future<void> _saveProfile() async {
    setState(() => _saving = true);
    try {
      String? imageUrl;
      if (_pickedImage != null) {
        final formData = await apiClient.uploadFile(
          '/upload',
          file: File(_pickedImage!.path),
          fieldName: 'image',
        );
        imageUrl = formData['url'] as String?;
      }
      await apiClient.put('/auth/profile', data: {
        'name': _nameCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        if (imageUrl != null) 'profileImage': imageUrl,
      });
      final meRes = await apiClient.get('/auth/me');
      final user = AppUser.fromJson(meRes.data as Map<String, dynamic>);
      ref.read(authProvider.notifier).setUser(user);
      if (mounted) {
        setState(() => _editing = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile updated!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user!;

    Widget avatar = _pickedImage != null
        ? CircleAvatar(
            radius: 44,
            backgroundImage: FileImage(File(_pickedImage!.path)),
          )
        : user.profileImage != null
            ? CircleAvatar(
                radius: 44,
                backgroundImage:
                    CachedNetworkImageProvider(user.profileImage!),
              )
            : CircleAvatar(
                radius: 44,
                backgroundColor: kPrimaryGreen.withValues(alpha: 0.12),
                child: Text(
                  user.name.isNotEmpty ? user.name[0].toUpperCase() : 'U',
                  style: const TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: kPrimaryGreen),
                ),
              );

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Center(
          child: Stack(
            children: [
              avatar,
              if (_editing)
                Positioned(
                  right: 0,
                  bottom: 0,
                  child: GestureDetector(
                    onTap: _pickImage,
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: const BoxDecoration(
                        color: kPrimaryGreen,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.camera_alt,
                          color: Colors.white, size: 16),
                    ),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        if (!_editing) ...[
          Center(
            child: Text(user.name,
                style: const TextStyle(
                    fontSize: 20, fontWeight: FontWeight.bold)),
          ),
          Center(
            child: Text(user.email,
                style: const TextStyle(color: Colors.grey)),
          ),
          if (user.phone != null)
            Center(
              child: Text(user.phone!,
                  style: const TextStyle(color: Colors.grey, fontSize: 13)),
            ),
          const SizedBox(height: 16),
          Center(
            child: OutlinedButton.icon(
              icon: const Icon(Icons.edit_outlined, size: 16),
              label: const Text('Edit Profile'),
              onPressed: () => setState(() => _editing = true),
            ),
          ),
        ] else ...[
          const SizedBox(height: 8),
          TextField(
            controller: _nameCtrl,
            decoration: const InputDecoration(
              labelText: 'Full Name',
              prefixIcon: Icon(Icons.person_outline),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _phoneCtrl,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              labelText: 'Phone',
              prefixIcon: Icon(Icons.phone_outlined),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => setState(() {
                    _editing = false;
                    _pickedImage = null;
                    _nameCtrl.text = user.name;
                    _phoneCtrl.text = user.phone ?? '';
                  }),
                  child: const Text('Cancel'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: _saving ? null : _saveProfile,
                  child: _saving
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : const Text('Save'),
                ),
              ),
            ],
          ),
        ],
        const SizedBox(height: 32),
        const Text('Settings',
            style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Colors.grey)),
        const SizedBox(height: 8),
        Card(
          child: Column(
            children: [
              SwitchListTile(
                title: const Text('Dark Mode'),
                secondary: const Icon(Icons.dark_mode_outlined),
                value: widget.themeMode == ThemeMode.dark,
                onChanged: (_) =>
                    ref.read(themeModeProvider.notifier).toggle(),
              ),
              const Divider(height: 0),
              ListTile(
                leading: const Icon(Icons.language),
                title: const Text('Language'),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _LangChip(
                      label: 'EN',
                      selected: widget.locale.languageCode == 'en',
                      onTap: () =>
                          ref.read(localeProvider.notifier).setLocale('en'),
                    ),
                    const SizedBox(width: 8),
                    _LangChip(
                      label: 'AR',
                      selected: widget.locale.languageCode == 'ar',
                      onTap: () =>
                          ref.read(localeProvider.notifier).setLocale('ar'),
                    ),
                  ],
                ),
              ),
              const Divider(height: 0),
              ListTile(
                leading: const Icon(Icons.chat_outlined),
                title: const Text('Messages'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.go('/messages'),
              ),
              const Divider(height: 0),
              ListTile(
                leading: const Icon(Icons.logout, color: Colors.red),
                title: const Text('Logout',
                    style: TextStyle(color: Colors.red)),
                onTap: () async {
                  await ref.read(authProvider.notifier).logout();
                  if (context.mounted) context.go('/role-select');
                },
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _LangChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _LangChip(
      {required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: BoxDecoration(
          color: selected ? kPrimaryGreen : Colors.transparent,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
              color: selected ? kPrimaryGreen : Colors.grey.shade300),
        ),
        child: Text(label,
            style: TextStyle(
                color: selected ? Colors.white : Colors.grey,
                fontWeight: FontWeight.w600,
                fontSize: 12)),
      ),
    );
  }
}

class _OrdersTab extends ConsumerWidget {
  const _OrdersTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ordersAsync = ref.watch(_myOrdersProvider);

    return ordersAsync.when(
      data: (orders) => orders.isEmpty
          ? const EmptyState(
              message: 'No orders yet.\nStart shopping!',
              icon: Icons.receipt_long_outlined,
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: orders.length,
              itemBuilder: (_, i) {
                final order = orders[i];
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
                            Text('Order #${order.id}',
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16)),
                            OrderStatusBadge(status: order.status),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '${order.items.length} item${order.items.length != 1 ? 's' : ''}  •  EGP ${order.displayTotal.toStringAsFixed(2)}',
                          style: const TextStyle(color: Colors.grey),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _formatDate(order.createdAt),
                          style: const TextStyle(
                              color: Colors.grey, fontSize: 12),
                        ),
                        if (order.status == 'waiting' || order.status == 'accepted')
                          Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: OutlinedButton.icon(
                              icon: const Icon(Icons.cancel_outlined,
                                  size: 16, color: Colors.red),
                              label: const Text('Cancel Order',
                                  style: TextStyle(color: Colors.red)),
                              onPressed: () => _cancelOrder(context, ref, order.id),
                            ),
                          ),
                      ],
                    ),
                  ),
                );
              },
            ),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Error: $e')),
    );
  }

  Future<void> _cancelOrder(
      BuildContext context, WidgetRef ref, int orderId) async {
    final ok = await showDialog<bool>(
          context: context,
          builder: (_) => AlertDialog(
            title: const Text('Cancel Order'),
            content: Text('Cancel order #$orderId?'),
            actions: [
              TextButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  child: const Text('No')),
              ElevatedButton(
                  onPressed: () => Navigator.of(context).pop(true),
                  style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red, foregroundColor: Colors.white),
                  child: const Text('Cancel Order')),
            ],
          ),
        ) ??
        false;

    if (!ok) return;
    try {
      await apiClient.patch('/orders/$orderId/cancel');
      ref.invalidate(_myOrdersProvider);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  String _formatDate(String s) {
    try {
      final d = DateTime.parse(s).toLocal();
      return '${d.day}/${d.month}/${d.year}  ${d.hour}:${d.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return s;
    }
  }
}
