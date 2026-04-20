class Supplier {
  final int id;
  final String name;
  final String? phone;
  final String? notes;

  const Supplier({
    required this.id,
    required this.name,
    this.phone,
    this.notes,
  });

  factory Supplier.fromJson(Map<String, dynamic> json) => Supplier(
        id: json['id'] as int,
        name: json['name'] as String? ?? '',
        phone: json['phone'] as String?,
        notes: json['notes'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'name': name,
        'phone': phone,
        'notes': notes,
      };
}

class SupplierOrderItem {
  final int? id;
  final String productName;
  final int quantity;
  final double unitPrice;
  final double subtotal;

  const SupplierOrderItem({
    this.id,
    required this.productName,
    required this.quantity,
    required this.unitPrice,
    required this.subtotal,
  });

  factory SupplierOrderItem.fromJson(Map<String, dynamic> json) =>
      SupplierOrderItem(
        id: json['id'] as int?,
        productName: json['productName'] as String? ?? '',
        quantity: (json['quantity'] as num).toInt(),
        unitPrice: (json['unitPrice'] as num).toDouble(),
        subtotal: (json['subtotal'] as num).toDouble(),
      );

  Map<String, dynamic> toJson() => {
        'productName': productName,
        'quantity': quantity,
        'unitPrice': unitPrice,
      };
}

class SupplierOrder {
  final int id;
  final int supplierId;
  final Supplier? supplier;
  final String? notes;
  final double totalPrice;
  final String orderedAt;
  final List<SupplierOrderItem> items;

  const SupplierOrder({
    required this.id,
    required this.supplierId,
    this.supplier,
    this.notes,
    required this.totalPrice,
    required this.orderedAt,
    required this.items,
  });

  factory SupplierOrder.fromJson(Map<String, dynamic> json) => SupplierOrder(
        id: json['id'] as int,
        supplierId: json['supplierId'] as int,
        supplier: json['supplier'] != null
            ? Supplier.fromJson(json['supplier'] as Map<String, dynamic>)
            : null,
        notes: json['notes'] as String?,
        totalPrice: (json['totalPrice'] as num).toDouble(),
        orderedAt: json['orderedAt'] as String? ?? '',
        items: (json['items'] as List<dynamic>?)
                ?.map((e) =>
                    SupplierOrderItem.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
      );
}
