class PromoCode {
  final int id;
  final String code;
  final String discountType;
  final double discountValue;
  final int? maxUses;
  final int usedCount;
  final bool active;
  final String? validFrom;
  final String? validUntil;

  const PromoCode({
    required this.id,
    required this.code,
    required this.discountType,
    required this.discountValue,
    this.maxUses,
    required this.usedCount,
    required this.active,
    this.validFrom,
    this.validUntil,
  });

  factory PromoCode.fromJson(Map<String, dynamic> json) => PromoCode(
        id: json['id'] as int,
        code: json['code'] as String? ?? '',
        discountType: json['discountType'] as String? ?? 'percentage',
        discountValue: (json['discountValue'] as num).toDouble(),
        maxUses: json['maxUses'] as int?,
        usedCount: json['usedCount'] as int? ?? 0,
        active: json['active'] as bool? ?? true,
        validFrom: json['validFrom'] as String?,
        validUntil: json['validUntil'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'code': code,
        'discountType': discountType,
        'discountValue': discountValue,
        'maxUses': maxUses,
        'active': active,
        'validFrom': validFrom,
        'validUntil': validUntil,
      };
}

class Voucher {
  final int id;
  final int userId;
  final String? customerName;
  final double amount;
  final bool used;
  final String? expiresAt;

  const Voucher({
    required this.id,
    required this.userId,
    this.customerName,
    required this.amount,
    required this.used,
    this.expiresAt,
  });

  factory Voucher.fromJson(Map<String, dynamic> json) => Voucher(
        id: json['id'] as int,
        userId: json['userId'] as int? ?? 0,
        customerName: json['customer']?['name'] as String?,
        amount: (json['amount'] as num).toDouble(),
        used: json['used'] as bool? ?? false,
        expiresAt: json['expiresAt'] as String?,
      );
}
