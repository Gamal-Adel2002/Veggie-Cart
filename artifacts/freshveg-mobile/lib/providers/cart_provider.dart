import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/cart_item.dart';
import '../models/product.dart';

class CartNotifier extends StateNotifier<List<CartItem>> {
  CartNotifier() : super([]);

  void addProduct(Product product) {
    final idx = state.indexWhere((i) => i.productId == product.id);
    if (idx >= 0) {
      final updated = List<CartItem>.from(state);
      updated[idx] = updated[idx].copyWith(quantity: updated[idx].quantity + 1);
      state = updated;
    } else {
      state = [
        ...state,
        CartItem(
          productId: product.id,
          name: product.name,
          nameAr: product.nameAr,
          price: product.price,
          unit: product.unit,
          image: product.images.isNotEmpty ? product.images.first : null,
        ),
      ];
    }
  }

  void updateQuantity(int productId, int qty) {
    if (qty <= 0) {
      state = state.where((i) => i.productId != productId).toList();
    } else {
      state = state.map((i) {
        if (i.productId == productId) return i.copyWith(quantity: qty);
        return i;
      }).toList();
    }
  }

  void remove(int productId) {
    state = state.where((i) => i.productId != productId).toList();
  }

  void clear() => state = [];

  double get subtotal =>
      state.fold(0, (sum, item) => sum + item.subtotal);

  int get itemCount => state.fold(0, (sum, item) => sum + item.quantity);
}

final cartProvider = StateNotifierProvider<CartNotifier, List<CartItem>>(
  (ref) => CartNotifier(),
);

final cartSubtotalProvider = Provider<double>((ref) {
  final cart = ref.watch(cartProvider.notifier);
  ref.watch(cartProvider);
  return cart.subtotal;
});

final cartCountProvider = Provider<int>((ref) {
  final cart = ref.watch(cartProvider.notifier);
  ref.watch(cartProvider);
  return cart.itemCount;
});
