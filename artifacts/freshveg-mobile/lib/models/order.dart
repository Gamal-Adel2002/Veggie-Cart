class OrderItem {
  final int? productId;
  final String productName;
  final String? productNameAr;
  final int quantity;
  final double unitPrice;
  final double subtotal;
  final String? unit;

  const OrderItem({
    this.productId,
    required this.productName,
    this.productNameAr,
    required this.quantity,
    required this.unitPrice,
    required this.subtotal,
    this.unit,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) => OrderItem(
        productId: json['productId'] as int?,
        productName: json['productName'] as String? ?? '',
        productNameAr: json['productNameAr'] as String?,
        quantity: (json['quantity'] as num).toInt(),
        unitPrice: (json['unitPrice'] as num).toDouble(),
        subtotal: (json['subtotal'] as num).toDouble(),
        unit: json['unit'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'productId': productId,
        'quantity': quantity,
      };
}

class Order {
  final int id;
  final int? customerId;
  final String customerName;
  final String customerPhone;
  final String status;
  final double totalPrice;
  final double? finalPrice;
  final double? deliveryFee;
  final double? discountAmount;
  final List<OrderItem> items;
  final String? deliveryAddress;
  final String? notes;
  final double? latitude;
  final double? longitude;
  final String createdAt;
  final int? deliveryPersonId;
  final String? zoneName;

  const Order({
    required this.id,
    this.customerId,
    required this.customerName,
    required this.customerPhone,
    required this.status,
    required this.totalPrice,
    this.finalPrice,
    this.deliveryFee,
    this.discountAmount,
    required this.items,
    this.deliveryAddress,
    this.notes,
    this.latitude,
    this.longitude,
    required this.createdAt,
    this.deliveryPersonId,
    this.zoneName,
  });

  double get displayTotal => finalPrice ?? totalPrice;

  factory Order.fromJson(Map<String, dynamic> json) => Order(
        id: json['id'] as int,
        customerId: json['customerId'] as int?,
        customerName: json['customerName'] as String? ?? '',
        customerPhone: json['customerPhone'] as String? ?? '',
        status: json['status'] as String? ?? 'waiting',
        totalPrice: (json['totalPrice'] as num?)?.toDouble() ?? 0,
        finalPrice: (json['finalPrice'] as num?)?.toDouble(),
        deliveryFee: (json['deliveryFee'] as num?)?.toDouble(),
        discountAmount: (json['discountAmount'] as num?)?.toDouble(),
        items: (json['items'] as List<dynamic>?)
                ?.map((e) => OrderItem.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        deliveryAddress: json['deliveryAddress'] as String?,
        notes: json['notes'] as String?,
        latitude: (json['latitude'] as num?)?.toDouble(),
        longitude: (json['longitude'] as num?)?.toDouble(),
        createdAt: json['createdAt'] as String? ?? '',
        deliveryPersonId: json['deliveryPersonId'] as int?,
        zoneName: json['zoneName'] as String?,
      );
}
