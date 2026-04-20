import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../config/theme.dart';
import '../../models/chat.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_client.dart';
import '../../widgets/empty_state.dart';

final _messagesProvider = FutureProvider<List<ChatMessage>>((ref) async {
  final res = await apiClient.get('/messages/my');
  return (res.data as List).map((e) => ChatMessage.fromJson(e)).toList();
});

class MessagesScreen extends ConsumerStatefulWidget {
  const MessagesScreen({super.key});

  @override
  ConsumerState<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends ConsumerState<MessagesScreen> {
  final _msgCtrl = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _msgCtrl.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (_msgCtrl.text.trim().isEmpty) return;
    setState(() => _sending = true);
    try {
      await apiClient.post('/messages', data: {'content': _msgCtrl.text.trim()});
      _msgCtrl.clear();
      ref.invalidate(_messagesProvider);
    } catch (_) {} finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final messagesAsync = ref.watch(_messagesProvider);
    final auth = ref.watch(authProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Messages', style: TextStyle(fontSize: 16)),
            Text('Chat with support', style: TextStyle(fontSize: 12, fontWeight: FontWeight.normal)),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: messagesAsync.when(
              data: (msgs) => msgs.isEmpty
                  ? const EmptyState(
                      message: 'No messages yet.\nSay hello!',
                      icon: Icons.chat_bubble_outline,
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      reverse: true,
                      itemCount: msgs.length,
                      itemBuilder: (_, i) {
                        final msg = msgs[msgs.length - 1 - i];
                        return _Bubble(message: msg);
                      },
                    ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Error: $e')),
            ),
          ),
          if (auth.isLoggedIn)
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
                          hintText: 'Type a message…',
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
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.send),
                      style: IconButton.styleFrom(
                          backgroundColor: kPrimaryGreen,
                          foregroundColor: Colors.white),
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

class _Bubble extends StatelessWidget {
  final ChatMessage message;

  const _Bubble({required this.message});

  @override
  Widget build(BuildContext context) {
    final isAdmin = message.isFromAdmin;
    return Align(
      alignment: isAdmin ? Alignment.centerLeft : Alignment.centerRight,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        constraints: BoxConstraints(
            maxWidth: MediaQuery.of(context).size.width * 0.72),
        decoration: BoxDecoration(
          color: isAdmin ? Colors.grey.shade100 : kPrimaryGreen,
          borderRadius: BorderRadius.circular(16).copyWith(
            bottomLeft: isAdmin ? const Radius.circular(4) : null,
            bottomRight: !isAdmin ? const Radius.circular(4) : null,
          ),
        ),
        child: Column(
          crossAxisAlignment:
              isAdmin ? CrossAxisAlignment.start : CrossAxisAlignment.end,
          children: [
            if (isAdmin)
              Text(
                message.senderName ?? 'Support',
                style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 11,
                    color: kPrimaryGreen),
              ),
            if (isAdmin) const SizedBox(height: 2),
            Text(
              message.content,
              style: TextStyle(
                  color: isAdmin ? Colors.black87 : Colors.white,
                  fontSize: 14),
            ),
            const SizedBox(height: 2),
            Text(
              _formatTime(message.createdAt),
              style: TextStyle(
                  color: isAdmin
                      ? Colors.grey
                      : Colors.white.withOpacity(0.7),
                  fontSize: 10),
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(String s) {
    try {
      final d = DateTime.parse(s).toLocal();
      return '${d.hour}:${d.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return '';
    }
  }
}
