import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../config/theme.dart';
import '../../models/chat.dart';
import '../../services/api_client.dart';
import '../../widgets/empty_state.dart';
import 'admin_shell.dart';

final _conversationsProvider = FutureProvider<List<Conversation>>((ref) async {
  final res = await apiClient.get('/messages/conversations');
  return (res.data as List).map((e) => Conversation.fromJson(e)).toList();
});

class AdminPrivateChatsScreen extends ConsumerWidget {
  const AdminPrivateChatsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final convsAsync = ref.watch(_conversationsProvider);

    return Scaffold(
      appBar: AdminAppBar(
        title: 'Private Chats',
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(_conversationsProvider),
          ),
        ],
      ),
      body: convsAsync.when(
        data: (convs) => convs.isEmpty
            ? const EmptyState(message: 'No conversations yet', icon: Icons.chat_outlined)
            : ListView.builder(
                padding: const EdgeInsets.all(12),
                itemCount: convs.length,
                itemBuilder: (_, i) {
                  final c = convs[i];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: kPrimaryGreen.withOpacity(0.1),
                        child: Text(
                          c.customerName.isNotEmpty
                              ? c.customerName[0].toUpperCase()
                              : 'C',
                          style: const TextStyle(
                              color: kPrimaryGreen, fontWeight: FontWeight.bold),
                        ),
                      ),
                      title: Text(c.customerName,
                          style: const TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: c.lastMessage != null
                          ? Text(c.lastMessage!, maxLines: 1, overflow: TextOverflow.ellipsis)
                          : const Text('No messages'),
                      trailing: c.unreadCount > 0
                          ? CircleAvatar(
                              radius: 12,
                              backgroundColor: kPrimaryGreen,
                              child: Text('${c.unreadCount}',
                                  style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold)),
                            )
                          : null,
                      onTap: () => _openChat(context, c),
                    ),
                  );
                },
              ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }

  void _openChat(BuildContext context, Conversation conv) {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => _ChatDetailScreen(conversation: conv),
    ));
  }
}

class _ChatDetailScreen extends ConsumerStatefulWidget {
  final Conversation conversation;

  const _ChatDetailScreen({required this.conversation});

  @override
  ConsumerState<_ChatDetailScreen> createState() => _ChatDetailScreenState();
}

class _ChatDetailScreenState extends ConsumerState<_ChatDetailScreen> {
  final _msgCtrl = TextEditingController();
  List<ChatMessage> _messages = [];
  bool _loading = true;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await apiClient.get('/messages/${widget.conversation.customerId}');
      setState(() {
        _messages = (res.data as List).map((e) => ChatMessage.fromJson(e)).toList();
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _send() async {
    if (_msgCtrl.text.trim().isEmpty) return;
    setState(() => _sending = true);
    try {
      await apiClient.post('/messages/${widget.conversation.customerId}',
          data: {'content': _msgCtrl.text.trim()});
      _msgCtrl.clear();
      await _load();
    } catch (_) {} finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.conversation.customerName)),
      body: Column(
        children: [
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _messages.isEmpty
                    ? const EmptyState(message: 'No messages yet')
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        reverse: true,
                        itemCount: _messages.length,
                        itemBuilder: (_, i) {
                          final msg = _messages[_messages.length - 1 - i];
                          final isAdmin = msg.isFromAdmin;
                          return Align(
                            alignment: isAdmin
                                ? Alignment.centerRight
                                : Alignment.centerLeft,
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 14, vertical: 10),
                              constraints: BoxConstraints(
                                  maxWidth:
                                      MediaQuery.of(context).size.width * 0.7),
                              decoration: BoxDecoration(
                                color: isAdmin
                                    ? kPrimaryGreen
                                    : Colors.grey.shade100,
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: Text(
                                msg.content,
                                style: TextStyle(
                                    color: isAdmin ? Colors.white : Colors.black87),
                              ),
                            ),
                          );
                        },
                      ),
          ),
          Container(
            padding: const EdgeInsets.all(12),
            color: Colors.white,
            child: SafeArea(
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _msgCtrl,
                      decoration: const InputDecoration(
                        hintText: 'Reply to customer…',
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
                    icon: const Icon(Icons.send),
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
