import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../config/theme.dart';
import '../../models/chat.dart';
import '../../services/api_client.dart';
import '../../services/sse_service.dart';
import '../../widgets/empty_state.dart';
import 'admin_shell.dart';

final _conversationsProvider =
    FutureProvider.autoDispose<List<Conversation>>((ref) async {
  final res = await apiClient.get('/messages/conversations');
  return (res.data as List).map((e) => Conversation.fromJson(e)).toList();
});

class AdminPrivateChatsScreen extends ConsumerStatefulWidget {
  const AdminPrivateChatsScreen({super.key});

  @override
  ConsumerState<AdminPrivateChatsScreen> createState() =>
      _AdminPrivateChatsScreenState();
}

class _AdminPrivateChatsScreenState
    extends ConsumerState<AdminPrivateChatsScreen> {
  SseService? _sse;
  StreamSubscription<Map<String, dynamic>>? _sseSub;

  @override
  void initState() {
    super.initState();
    _connectSse();
  }

  void _connectSse() async {
    final token = await ApiClient.getToken();
    if (token == null || !mounted) return;
    _sse = SseService(token: token);
    _sseSub = _sse!.stream.listen((event) {
      final type = event['type'] as String?;
      if (type == 'new_message' || type == 'message') {
        // Reload conversations list to refresh unread counts
        if (mounted) ref.invalidate(_conversationsProvider);
      }
    });
  }

  @override
  void dispose() {
    _sseSub?.cancel();
    _sse?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final convsAsync = ref.watch(_conversationsProvider);

    return Scaffold(
      appBar: AdminAppBar(
        title: 'Private Chats',
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Row(
              children: [
                const CircleAvatar(radius: 4, backgroundColor: Colors.green),
                const SizedBox(width: 4),
                Text('Live',
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade700)),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(_conversationsProvider),
          ),
        ],
      ),
      body: convsAsync.when(
        data: (convs) => convs.isEmpty
            ? const EmptyState(
                message: 'No conversations yet', icon: Icons.chat_outlined)
            : ListView.builder(
                padding: const EdgeInsets.all(12),
                itemCount: convs.length,
                itemBuilder: (_, i) {
                  final c = convs[i];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: kPrimaryGreen.withValues(alpha: 0.1),
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
                          ? Text(c.lastMessage!,
                              maxLines: 1, overflow: TextOverflow.ellipsis)
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
  final _scrollCtrl = ScrollController();
  List<ChatMessage> _messages = [];
  bool _loading = true;
  bool _sending = false;
  SseService? _sse;
  StreamSubscription<Map<String, dynamic>>? _sseSub;

  @override
  void initState() {
    super.initState();
    _load().then((_) => _connectSse());
  }

  Future<void> _load() async {
    try {
      final res =
          await apiClient.get('/messages/${widget.conversation.customerId}');
      if (mounted) {
        setState(() {
          _messages =
              (res.data as List).map((e) => ChatMessage.fromJson(e)).toList();
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _connectSse() async {
    final token = await ApiClient.getToken();
    if (token == null || !mounted) return;
    _sse = SseService(token: token);
    _sseSub = _sse!.stream.listen((event) {
      final type = event['type'] as String?;
      if (type == 'new_message' || type == 'message') {
        try {
          final msgData = event['message'] ?? event;
          final msg = ChatMessage.fromJson(msgData as Map<String, dynamic>);
          // Only add if from this conversation's customer
          if (mounted) {
            setState(() => _messages.add(msg));
            _scrollToBottom();
          }
        } catch (_) {}
      }
    });
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          0,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  void dispose() {
    _sseSub?.cancel();
    _sse?.dispose();
    _msgCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (_msgCtrl.text.trim().isEmpty) return;
    final text = _msgCtrl.text.trim();
    setState(() => _sending = true);
    try {
      final res = await apiClient.post(
        '/messages/${widget.conversation.customerId}',
        data: {'content': text},
      );
      _msgCtrl.clear();
      try {
        final msg = ChatMessage.fromJson(res.data as Map<String, dynamic>);
        if (mounted) {
          setState(() => _messages.add(msg));
          _scrollToBottom();
        }
      } catch (_) {}
    } catch (_) {} finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.conversation.customerName,
                style: const TextStyle(fontSize: 16)),
            Row(
              children: [
                const CircleAvatar(radius: 4, backgroundColor: Colors.green),
                const SizedBox(width: 4),
                const Text('Live',
                    style: TextStyle(
                        fontSize: 11, fontWeight: FontWeight.normal)),
              ],
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _messages.isEmpty
                    ? const EmptyState(message: 'No messages yet')
                    : ListView.builder(
                        controller: _scrollCtrl,
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
                                borderRadius: BorderRadius.circular(14).copyWith(
                                  bottomRight: isAdmin
                                      ? const Radius.circular(4)
                                      : null,
                                  bottomLeft: !isAdmin
                                      ? const Radius.circular(4)
                                      : null,
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: isAdmin
                                    ? CrossAxisAlignment.end
                                    : CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    msg.content,
                                    style: TextStyle(
                                        color: isAdmin
                                            ? Colors.white
                                            : Colors.black87),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    _formatTime(msg.createdAt),
                                    style: TextStyle(
                                        fontSize: 10,
                                        color: isAdmin
                                            ? Colors.white70
                                            : Colors.grey),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
          _buildInputBar(),
        ],
      ),
    );
  }

  Widget _buildInputBar() {
    return Container(
      padding: const EdgeInsets.all(12),
      color: Colors.white,
      child: SafeArea(
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: _msgCtrl,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _send(),
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
              icon: _sending
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.send),
              style: IconButton.styleFrom(
                  backgroundColor: kPrimaryGreen, foregroundColor: Colors.white),
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
