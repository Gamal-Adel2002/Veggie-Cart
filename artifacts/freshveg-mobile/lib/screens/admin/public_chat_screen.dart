import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../config/theme.dart';
import '../../models/chat.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_client.dart';
import '../../widgets/empty_state.dart';
import 'admin_shell.dart';

final _publicChatProvider = FutureProvider<List<ChatMessage>>((ref) async {
  final res = await apiClient.get('/public-chat');
  return (res.data as List).map((e) => ChatMessage.fromJson(e)).toList();
});

class AdminPublicChatScreen extends ConsumerStatefulWidget {
  const AdminPublicChatScreen({super.key});

  @override
  ConsumerState<AdminPublicChatScreen> createState() => _AdminPublicChatScreenState();
}

class _AdminPublicChatScreenState extends ConsumerState<AdminPublicChatScreen> {
  final _msgCtrl = TextEditingController();
  final _scroll = ScrollController();
  bool _sending = false;

  @override
  void dispose() {
    _msgCtrl.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (_msgCtrl.text.trim().isEmpty) return;
    setState(() => _sending = true);
    try {
      await apiClient.post('/public-chat', data: {'content': _msgCtrl.text.trim()});
      _msgCtrl.clear();
      ref.invalidate(_publicChatProvider);
    } catch (_) {} finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final chatAsync = ref.watch(_publicChatProvider);
    final user = ref.watch(authProvider).user;

    return Scaffold(
      appBar: AdminAppBar(
        title: 'Public Chat',
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(_publicChatProvider),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: chatAsync.when(
              data: (msgs) => msgs.isEmpty
                  ? const EmptyState(message: 'No messages yet', icon: Icons.forum_outlined)
                  : ListView.builder(
                      controller: _scroll,
                      padding: const EdgeInsets.all(16),
                      itemCount: msgs.length,
                      itemBuilder: (_, i) {
                        final msg = msgs[i];
                        final isMe = msg.senderId == user?.id;
                        return _ChatBubble(message: msg, isMe: isMe);
                      },
                    ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Error: $e')),
            ),
          ),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 8,
                    offset: const Offset(0, -2)),
              ],
            ),
            child: SafeArea(
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _msgCtrl,
                      decoration: const InputDecoration(
                        hintText: 'Message to community…',
                        filled: true,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.all(Radius.circular(24)),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding:
                            EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: _sending ? null : _send,
                    icon: _sending
                        ? const SizedBox(
                            width: 18, height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.send),
                    style: IconButton.styleFrom(
                        backgroundColor: kPrimaryGreen, foregroundColor: Colors.white),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ChatBubble extends StatelessWidget {
  final ChatMessage message;
  final bool isMe;

  const _ChatBubble({required this.message, required this.isMe});

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.72),
        decoration: BoxDecoration(
          color: isMe ? kPrimaryGreen : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(16).copyWith(
            bottomRight: isMe ? const Radius.circular(4) : null,
            bottomLeft: !isMe ? const Radius.circular(4) : null,
          ),
        ),
        child: Column(
          crossAxisAlignment:
              isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            Text(message.senderName ?? 'Admin',
                style: TextStyle(
                    fontSize: 11,
                    color: isMe ? Colors.white70 : kPrimaryGreen,
                    fontWeight: FontWeight.bold)),
            const SizedBox(height: 2),
            Text(message.content,
                style: TextStyle(color: isMe ? Colors.white : Colors.black87)),
          ],
        ),
      ),
    );
  }
}
