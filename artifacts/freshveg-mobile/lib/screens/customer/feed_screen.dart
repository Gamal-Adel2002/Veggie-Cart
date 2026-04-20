import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../config/theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/chat.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_client.dart';
import '../../widgets/empty_state.dart';

final _feedProvider = FutureProvider<List<FeedPost>>((ref) async {
  final res = await apiClient.get('/feed');
  return (res.data as List).map((e) => FeedPost.fromJson(e)).toList();
});

class FeedScreen extends ConsumerStatefulWidget {
  const FeedScreen({super.key});

  @override
  ConsumerState<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends ConsumerState<FeedScreen> {
  final _postCtrl = TextEditingController();
  bool _posting = false;

  @override
  void dispose() {
    _postCtrl.dispose();
    super.dispose();
  }

  Future<void> _post() async {
    if (_postCtrl.text.trim().isEmpty) return;
    setState(() => _posting = true);
    try {
      await apiClient.post('/feed', data: {'content': _postCtrl.text.trim()});
      _postCtrl.clear();
      ref.invalidate(_feedProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${AppLocalizations.of(context)!.failedToPost}: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _posting = false);
    }
  }

  Future<void> _react(int postId, String emoji) async {
    try {
      await apiClient.post('/feed/$postId/react', data: {'emoji': emoji});
      ref.invalidate(_feedProvider);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final feedAsync = ref.watch(_feedProvider);
    final auth = ref.watch(authProvider);

    return Scaffold(
      appBar: AppBar(title: Text(AppLocalizations.of(context)!.communityFeed)),
      body: Column(
        children: [
          if (auth.isLoggedIn)
            Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _postCtrl,
                      decoration: const InputDecoration(
                        hintText: 'Share something with the community…',
                        filled: true,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.all(Radius.circular(12)),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding:
                            EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      ),
                      maxLines: 2,
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: _posting ? null : _post,
                    icon: _posting
                        ? const SizedBox(
                            width: 18, height: 18,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.send),
                    style: IconButton.styleFrom(
                        backgroundColor: kPrimaryGreen, foregroundColor: Colors.white),
                  ),
                ],
              ),
            ),
          Expanded(
            child: feedAsync.when(
              data: (posts) => posts.isEmpty
                  ? const EmptyState(
                      message: 'No posts yet. Be the first to share!',
                      icon: Icons.feed_outlined,
                    )
                  : RefreshIndicator(
                      onRefresh: () async => ref.invalidate(_feedProvider),
                      child: ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        itemCount: posts.length,
                        itemBuilder: (_, i) => _PostCard(
                          post: posts[i],
                          onReact: (emoji) => _react(posts[i].id, emoji),
                        ),
                      ),
                    ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Error: $e')),
            ),
          ),
        ],
      ),
    );
  }
}

class _PostCard extends StatelessWidget {
  final FeedPost post;
  final Function(String) onReact;

  const _PostCard({required this.post, required this.onReact});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor: kPrimaryGreen.withOpacity(0.1),
                  child: Text(
                    (post.authorName ?? 'A')[0].toUpperCase(),
                    style: const TextStyle(
                        color: kPrimaryGreen, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(width: 10),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(post.authorName ?? 'Admin',
                        style: const TextStyle(fontWeight: FontWeight.w600)),
                    Text(_formatDate(post.createdAt),
                        style: const TextStyle(color: Colors.grey, fontSize: 11)),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(post.content),
            if (post.mediaUrl != null) ...[
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: CachedNetworkImage(
                  imageUrl: post.mediaUrl!,
                  fit: BoxFit.cover,
                ),
              ),
            ],
            if (post.reactions.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 6,
                children: post.reactions.entries.map((e) => GestureDetector(
                  onTap: () => onReact(e.key),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text('${e.key} ${e.value}',
                        style: const TextStyle(fontSize: 13)),
                  ),
                )).toList(),
              ),
            ],
            const SizedBox(height: 8),
            Row(
              children: ['👍', '❤️', '🌿', '😊'].map((emoji) => GestureDetector(
                onTap: () => onReact(emoji),
                child: Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: Text(emoji, style: const TextStyle(fontSize: 20)),
                ),
              )).toList(),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(String s) {
    try {
      final d = DateTime.parse(s).toLocal();
      return '${d.day}/${d.month}/${d.year}';
    } catch (_) {
      return s;
    }
  }
}
