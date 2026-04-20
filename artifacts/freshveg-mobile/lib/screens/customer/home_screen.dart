import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../config/theme.dart';
import '../../models/product.dart';
import '../../models/category.dart';
import '../../providers/locale_provider.dart';
import '../../services/api_client.dart';
import '../../widgets/product_card.dart';
import '../../widgets/loading_skeleton.dart';

final _featuredProvider = FutureProvider<List<Product>>((ref) async {
  final res = await apiClient.get('/products', params: {'featured': 'true'});
  return (res.data as List).map((e) => Product.fromJson(e)).toList();
});

final _categoriesProvider = FutureProvider<List<Category>>((ref) async {
  final res = await apiClient.get('/categories');
  return (res.data as List).map((e) => Category.fromJson(e)).toList();
});

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isAr = ref.watch(localeProvider).languageCode == 'ar';
    final featured = ref.watch(_featuredProvider);
    final categories = ref.watch(_categoriesProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAF8),
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 0,
            floating: true,
            snap: true,
            title: Row(
              children: [
                const Icon(Icons.eco, color: kPrimaryGreen),
                const SizedBox(width: 8),
                const Text('FreshVeg',
                    style: TextStyle(
                        color: kPrimaryGreen, fontWeight: FontWeight.bold)),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.search),
                  onPressed: () => context.go('/shop'),
                ),
              ],
            ),
          ),

          SliverToBoxAdapter(child: _HeroBanner()),

          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Popular Categories',
                      style:
                          TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  TextButton(
                    onPressed: () => context.go('/shop'),
                    child: const Text('View All'),
                  ),
                ],
              ),
            ),
          ),

          SliverToBoxAdapter(
            child: categories.when(
              data: (cats) => SizedBox(
                height: 100,
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  scrollDirection: Axis.horizontal,
                  itemCount: cats.length,
                  itemBuilder: (_, i) => _CategoryChip(category: cats[i]),
                ),
              ),
              loading: () => const SizedBox(
                  height: 100,
                  child: Center(child: CircularProgressIndicator())),
              error: (_, __) => const SizedBox(),
            ),
          ),

          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Featured Products',
                      style:
                          TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  TextButton(
                    onPressed: () => context.go('/shop'),
                    child: const Text('View All'),
                  ),
                ],
              ),
            ),
          ),

          featured.when(
            data: (products) => SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              sliver: SliverGrid(
                delegate: SliverChildBuilderDelegate(
                  (_, i) => ProductCard(product: products[i]),
                  childCount: products.length,
                ),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: 0.72,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                ),
              ),
            ),
            loading: () => const SliverToBoxAdapter(
                child: ProductGridSkeleton()),
            error: (e, _) => SliverToBoxAdapter(
                child: Center(child: Text('Error: $e'))),
          ),

          const SliverToBoxAdapter(child: SizedBox(height: 20)),
        ],
      ),
    );
  }
}

class _HeroBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 260,
      margin: const EdgeInsets.all(0),
      child: Stack(
        fit: StackFit.expand,
        children: [
          Image.asset(
            'assets/images/hero-bg-vegetables.png',
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Container(color: kPrimaryGreen),
          ),
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
                colors: [
                  kDarkBg.withOpacity(0.85),
                  kDarkBg.withOpacity(0.2),
                ],
              ),
            ),
          ),
          Positioned(
            right: 0,
            bottom: 0,
            top: 0,
            width: 140,
            child: Image.asset(
              'assets/images/hero-delivery-man.png',
              fit: BoxFit.contain,
              alignment: Alignment.bottomRight,
              errorBuilder: (_, __, ___) => const SizedBox(),
            ),
          ),
          Positioned(
            left: 20,
            top: 40,
            right: 150,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Fresh, Fast\nDelivery',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                    height: 1.2,
                  ),
                ).animate().fadeIn(duration: 600.ms).slideX(begin: -0.2),
                const SizedBox(height: 8),
                Text(
                  'Premium fruits & vegetables\ndelivered to your door',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.85),
                    fontSize: 12,
                    height: 1.4,
                  ),
                ).animate().fadeIn(delay: 200.ms, duration: 600.ms),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => context.go('/shop'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: kGold,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 20, vertical: 10),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                    textStyle: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                  child: const Text('Shop Now'),
                ).animate().fadeIn(delay: 400.ms, duration: 600.ms),
                const SizedBox(height: 12),
                Text(
                  '🚚 Free delivery on first order',
                  style: TextStyle(
                      color: kGoldLight.withOpacity(0.9), fontSize: 11),
                ),
              ],
            ),
          ),
          Positioned(
            bottom: 12,
            left: 12,
            child: Row(
              children: [
                _StatChip('10K+', 'Orders'),
                const SizedBox(width: 8),
                _StatChip('5K+', 'Customers'),
                const SizedBox(width: 8),
                _StatChip('30min', 'Avg'),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  final String value;
  final String label;

  const _StatChip(this.value, this.label);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.15),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.white.withOpacity(0.2)),
      ),
      child: Column(
        children: [
          Text(value,
              style: const TextStyle(
                  color: kGoldLight,
                  fontWeight: FontWeight.bold,
                  fontSize: 11)),
          Text(label,
              style: TextStyle(
                  color: Colors.white.withOpacity(0.7), fontSize: 9)),
        ],
      ),
    );
  }
}

class _CategoryChip extends ConsumerWidget {
  final Category category;

  const _CategoryChip({required this.category});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isAr = ref.watch(localeProvider).languageCode == 'ar';
    return GestureDetector(
      onTap: () =>
          context.go('/shop?category=${category.id}'),
      child: Container(
        margin: const EdgeInsets.only(right: 12),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                color: kPrimaryGreen.withOpacity(0.08),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                    color: kPrimaryGreen.withOpacity(0.15)),
              ),
              child: Center(
                child: Text(
                  category.icon ?? '🌿',
                  style: const TextStyle(fontSize: 26),
                ),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              isAr && category.nameAr.isNotEmpty
                  ? category.nameAr
                  : category.name,
              style: const TextStyle(fontSize: 11),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
