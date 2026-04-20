import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../config/theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/product.dart';
import '../../models/category.dart';
import '../../providers/locale_provider.dart';
import '../../services/api_client.dart';
import '../../widgets/product_card.dart';
import '../../widgets/loading_skeleton.dart';
import '../../widgets/empty_state.dart';

final _shopProductsProvider =
    FutureProvider.family<List<Product>, Map<String, String>>((ref, params) async {
  final res = await apiClient.get('/products', params: params);
  return (res.data as List).map((e) => Product.fromJson(e)).toList();
});

final _shopCategoriesProvider = FutureProvider<List<Category>>((ref) async {
  final res = await apiClient.get('/categories');
  return (res.data as List).map((e) => Category.fromJson(e)).toList();
});

class ShopScreen extends ConsumerStatefulWidget {
  const ShopScreen({super.key});

  @override
  ConsumerState<ShopScreen> createState() => _ShopScreenState();
}

class _ShopScreenState extends ConsumerState<ShopScreen> {
  String _search = '';
  int? _selectedCategory;
  bool _inStockOnly = false;

  @override
  Widget build(BuildContext context) {
    final isAr = ref.watch(localeProvider).languageCode == 'ar';
    final categories = ref.watch(_shopCategoriesProvider);

    final params = <String, String>{};
    if (_search.isNotEmpty) params['search'] = _search;
    if (_selectedCategory != null) params['category'] = '$_selectedCategory';
    if (_inStockOnly) params['inStock'] = 'true';

    final products = ref.watch(_shopProductsProvider(params));

    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAF8),
      appBar: AppBar(
        title: Text(l10n.shop),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(56),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
            child: TextField(
              decoration: InputDecoration(
                hintText: l10n.searchProducts,
                prefixIcon: const Icon(Icons.search, size: 20),
                filled: true,
                fillColor: Colors.grey.shade100,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(vertical: 8),
              ),
              onChanged: (v) => setState(() => _search = v),
            ),
          ),
        ),
      ),
      body: Column(
        children: [
          categories.when(
            data: (cats) => SizedBox(
              height: 46,
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                scrollDirection: Axis.horizontal,
                children: [
                  _FilterChip(
                    label: 'All',
                    selected: _selectedCategory == null,
                    onTap: () => setState(() => _selectedCategory = null),
                  ),
                  ...cats.map((c) => _FilterChip(
                        label: isAr && c.nameAr.isNotEmpty ? c.nameAr : c.name,
                        selected: _selectedCategory == c.id,
                        onTap: () => setState(() => _selectedCategory = c.id),
                      )),
                ],
              ),
            ),
            loading: () => const SizedBox(height: 46),
            error: (_, __) => const SizedBox(height: 46),
          ),
          Expanded(
            child: products.when(
              data: (ps) => ps.isEmpty
                  ? const EmptyState(
                      message: 'No products found',
                      icon: Icons.search_off,
                    )
                  : GridView.builder(
                      padding: const EdgeInsets.all(12),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        childAspectRatio: 0.72,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                      ),
                      itemCount: ps.length,
                      itemBuilder: (_, i) => ProductCard(product: ps[i]),
                    ),
              loading: () => const ProductGridSkeleton(),
              error: (e, _) => Center(child: Text('Error: $e')),
            ),
          ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(right: 8, top: 4, bottom: 4),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? kPrimaryGreen : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
              color: selected ? kPrimaryGreen : Colors.grey.shade300),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.white : Colors.grey.shade700,
            fontSize: 13,
            fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}
