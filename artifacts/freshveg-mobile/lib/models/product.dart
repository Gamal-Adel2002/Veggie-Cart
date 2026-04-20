class Product {
  final int id;
  final String name;
  final String nameAr;
  final double price;
  final String unit;
  final int? categoryId;
  final bool featured;
  final bool inStock;
  final int? quantity;
  final int? quantityAlert;
  final List<String> images;
  final String? description;
  final String? descriptionAr;

  const Product({
    required this.id,
    required this.name,
    required this.nameAr,
    required this.price,
    required this.unit,
    this.categoryId,
    this.featured = false,
    this.inStock = true,
    this.quantity,
    this.quantityAlert,
    this.images = const [],
    this.description,
    this.descriptionAr,
  });

  factory Product.fromJson(Map<String, dynamic> json) => Product(
        id: json['id'] as int,
        name: json['name'] as String? ?? '',
        nameAr: json['nameAr'] as String? ?? '',
        price: (json['price'] as num).toDouble(),
        unit: json['unit'] as String? ?? 'piece',
        categoryId: json['categoryId'] as int?,
        featured: json['featured'] as bool? ?? false,
        inStock: json['inStock'] as bool? ?? true,
        quantity: json['quantity'] as int?,
        quantityAlert: json['quantityAlert'] as int?,
        images: (json['images'] as List<dynamic>?)?.cast<String>() ?? [],
        description: json['description'] as String?,
        descriptionAr: json['descriptionAr'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'name': name,
        'nameAr': nameAr,
        'price': price,
        'unit': unit,
        'categoryId': categoryId,
        'featured': featured,
        'inStock': inStock,
        'quantity': quantity,
        'quantityAlert': quantityAlert,
        'images': images,
        'description': description,
        'descriptionAr': descriptionAr,
      };
}
