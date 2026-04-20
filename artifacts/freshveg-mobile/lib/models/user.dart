class AppUser {
  final int id;
  final String name;
  final String email;
  final String? phone;
  final String role;
  final String? profileImage;
  final bool? active;

  const AppUser({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    required this.role,
    this.profileImage,
    this.active,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: json['id'] as int,
        name: json['name'] as String? ?? '',
        email: json['email'] as String? ?? '',
        phone: json['phone'] as String?,
        role: json['role'] as String? ?? 'customer',
        profileImage: json['profileImage'] as String?,
        active: json['active'] as bool?,
      );

  bool get isAdmin => role == 'admin';
  bool get isDelivery => role == 'delivery';
  bool get isCustomer => role == 'customer';
}

class DeliveryPerson {
  final int id;
  final String name;
  final String? phone;
  final String? email;

  const DeliveryPerson({
    required this.id,
    required this.name,
    this.phone,
    this.email,
  });

  factory DeliveryPerson.fromJson(Map<String, dynamic> json) => DeliveryPerson(
        id: json['id'] as int,
        name: json['name'] as String? ?? '',
        phone: json['phone'] as String?,
        email: json['email'] as String?,
      );
}
