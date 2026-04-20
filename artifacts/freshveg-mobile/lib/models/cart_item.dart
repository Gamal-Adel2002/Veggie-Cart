class CartItem {
  final int productId;
  final String name;
  final String nameAr;
  final double price;
  final String unit;
  int quantity;
  final String? image;

  CartItem({
    required this.productId,
    required this.name,
    required this.nameAr,
    required this.price,
    required this.unit,
    this.quantity = 1,
    this.image,
  });

  double get subtotal => price * quantity;

  CartItem copyWith({int? quantity}) => CartItem(
        productId: productId,
        name: name,
        nameAr: nameAr,
        price: price,
        unit: unit,
        quantity: quantity ?? this.quantity,
        image: image,
      );
}
