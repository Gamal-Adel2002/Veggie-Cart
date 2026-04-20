class Category {
  final int id;
  final String name;
  final String nameAr;
  final String? icon;

  const Category({
    required this.id,
    required this.name,
    required this.nameAr,
    this.icon,
  });

  factory Category.fromJson(Map<String, dynamic> json) => Category(
        id: json['id'] as int,
        name: json['name'] as String? ?? '',
        nameAr: json['nameAr'] as String? ?? '',
        icon: json['icon'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'name': name,
        'nameAr': nameAr,
        'icon': icon,
      };
}
