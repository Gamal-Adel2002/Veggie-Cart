import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import '../../config/theme.dart';
import '../../models/product.dart';
import '../../providers/cart_provider.dart';
import '../../providers/locale_provider.dart';
import '../../services/api_client.dart';

final _productDetailProvider =
    FutureProvider.family<Product, int>((ref, id) async {
  final res = await apiClient.get('/products/$id');
  return Product.fromJson(res.data);
});

class ProductDetailScreen extends ConsumerWidget {
  final int id;

  const ProductDetailScreen({super.key, required this.id});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final productAsync = ref.watch(_productDetailProvider(id));
    final isAr = ref.watch(localeProvider).languageCode == 'ar';
    final cart = ref.watch(cartProvider);
    final qty = cart
        .where((i) => i.productId == id)
        .map((i) => i.quantity)
        .firstOrNull ?? 0;

    return Scaffold(
      backgroundColor: Colors.white,
      body: productAsync.when(
        data: (product) => CustomScrollView(
          slivers: [
            SliverAppBar(
              expandedHeight: 300,
              pinned: true,
              backgroundColor: Colors.white,
              iconTheme: const IconThemeData(color: Colors.white),
              flexibleSpace: FlexibleSpaceBar(
                background: product.images.isNotEmpty
                    ? CachedNetworkImage(
                        imageUrl: resolveImageUrl(product.images.first),
                        fit: BoxFit.cover,
                        errorWidget: (_, __, ___) => Container(
                          color: Colors.grey.shade100,
                          child: const Icon(Icons.eco,
                              size: 80, color: Colors.grey),
                        ),
                      )
                    : Container(
                        color: Colors.grey.shade100,
                        child: const Icon(Icons.eco,
                            size: 80, color: Colors.grey),
                      ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            isAr && product.nameAr.isNotEmpty
                                ? product.nameAr
                                : product.name,
                            style: const TextStyle(
                                fontSize: 24, fontWeight: FontWeight.bold),
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              'EGP ${product.price.toStringAsFixed(2)}',
                              style: const TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold,
                                  color: kPrimaryGreen),
                            ),
                            Text('/${product.unit}',
                                style: const TextStyle(color: Colors.grey)),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: product.inStock
                                ? Colors.green.shade50
                                : Colors.red.shade50,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                                color: product.inStock
                                    ? Colors.green.shade200
                                    : Colors.red.shade200),
                          ),
                          child: Text(
                            product.inStock ? 'In Stock' : 'Out of Stock',
                            style: TextStyle(
                                color: product.inStock
                                    ? Colors.green
                                    : Colors.red,
                                fontSize: 12,
                                fontWeight: FontWeight.w600),
                          ),
                        ),
                        if (product.featured) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: kGold.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                  color: kGold.withOpacity(0.4)),
                            ),
                            child: const Text('⭐ Featured',
                                style: TextStyle(
                                    color: kGold,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600)),
                          ),
                        ],
                      ],
                    ),
                    if (product.description != null &&
                        product.description!.isNotEmpty) ...[
                      const SizedBox(height: 20),
                      const Text('Description',
                          style: TextStyle(
                              fontSize: 16, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      Text(
                        isAr && product.descriptionAr != null
                            ? product.descriptionAr!
                            : product.description!,
                        style: TextStyle(
                            color: Colors.grey.shade700, height: 1.5),
                      ),
                    ],
                    const SizedBox(height: 40),
                  ],
                ),
              ),
            ),
          ],
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
      bottomNavigationBar: productAsync.when(
        data: (product) => product.inStock
            ? SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: qty > 0
                      ? Row(
                          children: [
                            Expanded(
                              child: OutlinedButton(
                                onPressed: () => context.go('/cart'),
                                child: const Text('View Cart'),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                                children: [
                                  IconButton(
                                    icon: const Icon(Icons.remove_circle_outline),
                                    onPressed: () => ref
                                        .read(cartProvider.notifier)
                                        .updateQuantity(product.id, qty - 1),
                                  ),
                                  Text('$qty',
                                      style: const TextStyle(
                                          fontSize: 18,
                                          fontWeight: FontWeight.bold)),
                                  IconButton(
                                    icon: const Icon(Icons.add_circle_outline,
                                        color: kPrimaryGreen),
                                    onPressed: () => ref
                                        .read(cartProvider.notifier)
                                        .updateQuantity(product.id, qty + 1),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        )
                      : SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            icon: const Icon(Icons.add_shopping_cart),
                            label: const Text('Add to Cart'),
                            onPressed: () => ref
                                .read(cartProvider.notifier)
                                .addProduct(product),
                          ),
                        ),
                ),
              )
            : const SizedBox(),
        loading: () => const SizedBox(),
        error: (_, __) => const SizedBox(),
      ),
    );
  }
}
