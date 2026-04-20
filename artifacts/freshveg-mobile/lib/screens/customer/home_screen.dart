import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../config/theme.dart';
import '../../l10n/app_localizations.dart';
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
    final featured = ref.watch(_featuredProvider);
    final categories = ref.watch(_categoriesProvider);
    final l10n = AppLocalizations.of(context)!;

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
                Text(l10n.appName,
                    style: const TextStyle(
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
                  Text(l10n.popularCategories,
                      style: const TextStyle(
                          fontSize: 18, fontWeight: FontWeight.bold)),
                  TextButton(
                    onPressed: () => context.go('/shop'),
                    child: Text(l10n.viewAll),
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
                  Text(l10n.featuredProducts,
                      style: const TextStyle(
                          fontSize: 18, fontWeight: FontWeight.bold)),
                  TextButton(
                    onPressed: () => context.go('/shop'),
                    child: Text(l10n.viewAll),
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
            loading: () =>
                const SliverToBoxAdapter(child: ProductGridSkeleton()),
            error: (e, _) =>
                SliverToBoxAdapter(child: Center(child: Text('Error: $e'))),
          ),

          const SliverToBoxAdapter(child: SizedBox(height: 20)),
        ],
      ),
    );
  }
}

class _HeroBanner extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final screenH = MediaQuery.of(context).size.height;
    final isAr = ref.watch(localeProvider).languageCode == 'ar';
    final bannerH = (screenH * 0.52).clamp(300.0, 560.0);

    return SizedBox(
      height: bannerH,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Background — vegetables image
          Image.asset(
            'assets/images/hero-bg-vegetables.png',
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Container(color: kPrimaryGreen),
          ),

          // Dark-to-transparent gradient overlay
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: isAr ? Alignment.centerRight : Alignment.centerLeft,
                end: isAr ? Alignment.centerLeft : Alignment.centerRight,
                colors: [
                  kDarkBg.withValues(alpha: 0.92),
                  kDarkBg.withValues(alpha: 0.15),
                ],
                stops: const [0.0, 1.0],
              ),
            ),
          ),

          // Bottom gradient fade
          Align(
            alignment: Alignment.bottomCenter,
            child: Container(
              height: 120,
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                  colors: [Color(0xFFF8FAF8), Colors.transparent],
                ),
              ),
            ),
          ),

          // Delivery-man image (right side)
          Positioned(
            right: isAr ? null : 0,
            left: isAr ? 0 : null,
            bottom: 0,
            top: 0,
            width: (MediaQuery.of(context).size.width * 0.45).clamp(140.0, 220.0),
            child: Image.asset(
              'assets/images/hero-delivery-man.png',
              fit: BoxFit.contain,
              alignment: Alignment.bottomRight,
              errorBuilder: (_, __, ___) => const SizedBox(),
            )
                .animate()
                .fadeIn(delay: 300.ms, duration: 700.ms)
                .slideX(begin: isAr ? -0.1 : 0.1, end: 0),
          ),

          // Text content
          Positioned(
            left: isAr ? null : 24,
            right: isAr ? 24 : null,
            top: bannerH * 0.14,
            width: (MediaQuery.of(context).size.width * 0.55).clamp(180.0, 300.0),
            child: Column(
              crossAxisAlignment: isAr
                  ? CrossAxisAlignment.end
                  : CrossAxisAlignment.start,
              children: [
                Text(
                  isAr ? 'طازج\nوسريع' : 'Fresh,\nFast Delivery',
                  textDirection:
                      isAr ? TextDirection.rtl : TextDirection.ltr,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 32,
                    fontWeight: FontWeight.w900,
                    height: 1.15,
                    letterSpacing: -0.5,
                  ),
                )
                    .animate()
                    .fadeIn(duration: 600.ms)
                    .slideX(begin: isAr ? 0.2 : -0.2, end: 0),
                const SizedBox(height: 10),
                Text(
                  isAr
                      ? 'فواكه وخضروات طازجة\nتُوصَّل إلى بابك'
                      : 'Premium fruits & vegetables\ndelivered to your door',
                  textDirection:
                      isAr ? TextDirection.rtl : TextDirection.ltr,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.85),
                    fontSize: 13,
                    height: 1.5,
                  ),
                )
                    .animate()
                    .fadeIn(delay: 200.ms, duration: 600.ms),
                const SizedBox(height: 20),

                // Primary CTA
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    ElevatedButton(
                      onPressed: () => context.go('/shop'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: kGold,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 22, vertical: 12),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                        textStyle: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 14),
                        elevation: 4,
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(isAr ? 'تسوق الآن' : 'Shop Now'),
                          const SizedBox(width: 6),
                          const Icon(Icons.arrow_forward, size: 16),
                        ],
                      ),
                    ).animate().fadeIn(delay: 400.ms, duration: 600.ms),
                    const SizedBox(width: 10),
                    // Secondary CTA
                    OutlinedButton(
                      onPressed: () => context.go('/feed'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: const BorderSide(color: Colors.white54),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 12),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Text(isAr ? 'العروض' : 'Offers'),
                    ).animate().fadeIn(delay: 500.ms, duration: 600.ms),
                  ],
                ),

                const SizedBox(height: 16),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.local_shipping_outlined,
                        color: kGoldLight, size: 14),
                    const SizedBox(width: 4),
                    Text(
                      isAr ? 'توصيل مجاني للطلب الأول' : 'Free delivery on first order',
                      style: TextStyle(
                          color: kGoldLight.withValues(alpha: 0.9),
                          fontSize: 11),
                    ),
                  ],
                ).animate().fadeIn(delay: 600.ms, duration: 600.ms),
              ],
            ),
          ),

          // Stats row at bottom
          Positioned(
            bottom: 24,
            left: 24,
            right: 24,
            child: Row(
              mainAxisAlignment: isAr
                  ? MainAxisAlignment.end
                  : MainAxisAlignment.start,
              children: [
                _StatChip('10K+', isAr ? 'طلب' : 'Orders'),
                const SizedBox(width: 8),
                _StatChip('5K+', isAr ? 'عميل' : 'Customers'),
                const SizedBox(width: 8),
                _StatChip('30min', isAr ? 'توصيل' : 'Avg Delivery'),
              ],
            ).animate().fadeIn(delay: 700.ms, duration: 600.ms),
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
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.13),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
      ),
      child: Column(
        children: [
          Text(value,
              style: const TextStyle(
                  color: kGoldLight,
                  fontWeight: FontWeight.bold,
                  fontSize: 12)),
          Text(label,
              style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.75), fontSize: 9)),
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
      onTap: () => context.go('/shop?category=${category.id}'),
      child: Container(
        margin: const EdgeInsets.only(right: 12),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                color: kPrimaryGreen.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: kPrimaryGreen.withValues(alpha: 0.15)),
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
