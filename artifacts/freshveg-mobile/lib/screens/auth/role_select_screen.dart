import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/theme.dart';

class RoleSelectScreen extends StatelessWidget {
  const RoleSelectScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kPrimaryGreen,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const Spacer(),
              const Icon(Icons.eco, color: Colors.white, size: 72),
              const SizedBox(height: 16),
              const Text(
                'FreshVeg',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 40,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.5,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Fresh Grocery Delivery',
                style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 16),
              ),
              const Spacer(),
              _RoleButton(
                icon: Icons.shopping_bag_outlined,
                label: 'Shop as Customer',
                onTap: () => context.go('/login'),
              ),
              const SizedBox(height: 16),
              _RoleButton(
                icon: Icons.admin_panel_settings_outlined,
                label: 'Admin Portal',
                onTap: () => context.go('/admin-login'),
                outlined: true,
              ),
              const SizedBox(height: 16),
              _RoleButton(
                icon: Icons.delivery_dining_outlined,
                label: 'Delivery Portal',
                onTap: () => context.go('/delivery-login'),
                outlined: true,
              ),
              const Spacer(),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoleButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool outlined;

  const _RoleButton({
    required this.icon,
    required this.label,
    required this.onTap,
    this.outlined = false,
  });

  @override
  Widget build(BuildContext context) {
    if (outlined) {
      return OutlinedButton.icon(
        onPressed: onTap,
        icon: Icon(icon, color: Colors.white),
        label: Text(label, style: const TextStyle(color: Colors.white, fontSize: 16)),
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: Colors.white54),
          minimumSize: const Size(double.infinity, 54),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      );
    }
    return ElevatedButton.icon(
      onPressed: onTap,
      icon: Icon(icon),
      label: Text(label, style: const TextStyle(fontSize: 16)),
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.white,
        foregroundColor: kPrimaryGreen,
        minimumSize: const Size(double.infinity, 54),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    );
  }
}
