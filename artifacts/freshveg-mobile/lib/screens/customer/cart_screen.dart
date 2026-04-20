import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../config/theme.dart';
import '../../providers/cart_provider.dart';
import '../../providers/locale_provider.dart';
import '../../services/api_client.dart';
import '../../widgets/empty_state.dart';

class CartScreen extends ConsumerWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartProvider);
    final cartNotifier = ref.read(cartProvider.notifier);
    final isAr = ref.watch(localeProvider).languageCode == 'ar';

    if (cart.isEmpty) {
      return const Scaffold(
        body: EmptyState(
          message: 'Your cart is empty.\nStart shopping!',
          icon: Icons.shopping_cart_outlined,
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('Cart (${cart.length} items)'),
        actions: [
          TextButton(
            onPressed: () => cartNotifier.clear(),
            child: const Text('Clear', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: cart.length,
        itemBuilder: (_, i) {
          final item = cart[i];
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: item.image != null
                        ? CachedNetworkImage(
                            imageUrl: resolveImageUrl(item.image),
                            width: 64,
                            height: 64,
                            fit: BoxFit.cover,
                            errorWidget: (_, __, ___) => Container(
                              width: 64,
                              height: 64,
                              color: Colors.grey.shade100,
                              child: const Icon(Icons.eco),
                            ),
                          )
                        : Container(
                            width: 64,
                            height: 64,
                            color: Colors.grey.shade100,
                            child: const Icon(Icons.eco),
                          ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isAr && item.nameAr.isNotEmpty
                              ? item.nameAr
                              : item.name,
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'EGP ${item.price.toStringAsFixed(2)} / ${item.unit}',
                          style: const TextStyle(
                              color: Colors.grey, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  Column(
                    children: [
                      Row(
                        children: [
                          _QtyBtn(
                            icon: Icons.remove,
                            onTap: () => cartNotifier.updateQuantity(
                                item.productId, item.quantity - 1),
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            child: Text('${item.quantity}',
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold, fontSize: 16)),
                          ),
                          _QtyBtn(
                            icon: Icons.add,
                            onTap: () => cartNotifier.updateQuantity(
                                item.productId, item.quantity + 1),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'EGP ${item.subtotal.toStringAsFixed(2)}',
                        style: const TextStyle(
                            color: kPrimaryGreen,
                            fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 10,
                  offset: const Offset(0, -4)),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Subtotal',
                      style: TextStyle(fontSize: 16, color: Colors.grey)),
                  Text(
                    'EGP ${cartNotifier.subtotal.toStringAsFixed(2)}',
                    style: const TextStyle(
                        fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => context.push('/checkout'),
                  child: const Text('Proceed to Checkout'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QtyBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _QtyBtn({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 28,
        height: 28,
        decoration: BoxDecoration(
          color: kPrimaryGreen.withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: kPrimaryGreen.withOpacity(0.3)),
        ),
        child: Icon(icon, size: 14, color: kPrimaryGreen),
      ),
    );
  }
}
