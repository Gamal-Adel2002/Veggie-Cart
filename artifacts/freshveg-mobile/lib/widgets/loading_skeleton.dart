import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

class LoadingSkeleton extends StatelessWidget {
  final double width;
  final double height;
  final double radius;

  const LoadingSkeleton({
    super.key,
    this.width = double.infinity,
    this.height = 16,
    this.radius = 8,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Colors.grey.shade200,
        borderRadius: BorderRadius.circular(radius),
      ),
    )
        .animate(onPlay: (c) => c.repeat())
        .shimmer(duration: 1200.ms, color: Colors.grey.shade100);
  }
}

class ProductGridSkeleton extends StatelessWidget {
  const ProductGridSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 0.72,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: 6,
      itemBuilder: (_, __) => Card(
        child: Column(
          children: [
            const Expanded(
              flex: 3,
              child: LoadingSkeleton(height: double.infinity, radius: 0),
            ),
            Expanded(
              flex: 2,
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    LoadingSkeleton(width: 80),
                    SizedBox(height: 6),
                    LoadingSkeleton(width: 50),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
