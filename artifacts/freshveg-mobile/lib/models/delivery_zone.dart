class DeliveryZone {
  final int id;
  final String name;
  final double centerLat;
  final double centerLng;
  final double radiusKm;
  final double fee;
  final bool active;

  const DeliveryZone({
    required this.id,
    required this.name,
    required this.centerLat,
    required this.centerLng,
    required this.radiusKm,
    this.fee = 0,
    required this.active,
  });

  factory DeliveryZone.fromJson(Map<String, dynamic> json) => DeliveryZone(
        id: json['id'] as int,
        name: json['name'] as String? ?? '',
        centerLat: (json['centerLat'] as num?)?.toDouble() ?? 0,
        centerLng: (json['centerLng'] as num?)?.toDouble() ?? 0,
        radiusKm: (json['radiusKm'] as num?)?.toDouble() ?? 1,
        fee: (json['fee'] as num?)?.toDouble() ?? 0,
        active: json['active'] as bool? ?? true,
      );

  Map<String, dynamic> toJson() => {
        'name': name,
        'centerLat': centerLat,
        'centerLng': centerLng,
        'radiusKm': radiusKm,
        'fee': fee,
        'active': active,
      };
}

class DeliveryFeeSettings {
  final String feeType;
  final double feeValue;
  final double minimumFee;

  const DeliveryFeeSettings({
    required this.feeType,
    required this.feeValue,
    required this.minimumFee,
  });

  factory DeliveryFeeSettings.fromJson(Map<String, dynamic> json) =>
      DeliveryFeeSettings(
        feeType: json['feeType'] as String? ?? 'fixed',
        feeValue: (json['feeValue'] as num?)?.toDouble() ?? 0,
        minimumFee: (json['minimumFee'] as num?)?.toDouble() ?? 0,
      );

  double calculate(double subtotal) {
    double fee = feeType == 'percentage' ? subtotal * feeValue / 100 : feeValue;
    if (minimumFee > 0) fee = fee < minimumFee ? minimumFee : fee;
    return double.parse(fee.toStringAsFixed(2));
  }
}
