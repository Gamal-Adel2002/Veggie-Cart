import 'package:flutter/material.dart';

class OrderStatusBadge extends StatelessWidget {
  final String status;

  const OrderStatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final (color, label) = _config(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.4)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  (Color, String) _config(String s) {
    switch (s) {
      case 'waiting':
        return (Colors.orange, 'Waiting');
      case 'confirmed':
        return (Colors.blue, 'Confirmed');
      case 'preparing':
        return (Colors.purple, 'Preparing');
      case 'out_for_delivery':
        return (Colors.indigo, 'Out for Delivery');
      case 'delivered':
        return (Colors.green, 'Delivered');
      case 'cancelled':
        return (Colors.red, 'Cancelled');
      default:
        return (Colors.grey, s);
    }
  }
}
