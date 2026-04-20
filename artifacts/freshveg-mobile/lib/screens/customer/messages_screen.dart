import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../config/theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/chat.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_client.dart';
import '../../services/sse_service.dart';
import '../../widgets/empty_state.dart';

class MessagesScreen extends ConsumerStatefulWidget {
  const MessagesScreen({super.key});

  @override
  ConsumerState<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends ConsumerState<MessagesScreen> {
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
      final res = await apiClient.get('/messages/my');
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
          final msg = ChatMessage.fromJson(event['message'] ?? event);
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
      final res = await apiClient.post('/messages', data: {'content': text});
      _msgCtrl.clear();
      // Optimistically add if SSE doesn't deliver it
      final msg = ChatMessage.fromJson(res.data);
      if (mounted) {
        setState(() => _messages.add(msg));
        _scrollToBottom();
      }
    } catch (_) {} finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(l10n.supportChat, style: const TextStyle(fontSize: 16)),
            Row(
              children: [
                const CircleAvatar(
                  radius: 4,
                  backgroundColor: Colors.green,
                ),
                const SizedBox(width: 4),
                Text(l10n.liveIndicator,
                    style: const TextStyle(
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
                    ? const EmptyState(
                        message: 'No messages yet.\nSay hello!',
                        icon: Icons.chat_bubble_outline,
                      )
                    : ListView.builder(
                        controller: _scrollCtrl,
                        padding: const EdgeInsets.all(16),
                        reverse: true,
                        itemCount: _messages.length,
                        itemBuilder: (_, i) {
                          final msg = _messages[_messages.length - 1 - i];
                          return _Bubble(message: msg);
                        },
                      ),
          ),
          if (auth.isLoggedIn) _buildInputBar(),
        ],
      ),
    );
  }

  Widget _buildInputBar() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
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
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _send(),
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
                      width: 18,
                      height: 18,
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
        constraints:
            BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.72),
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
                  color: isAdmin ? Colors.black87 : Colors.white, fontSize: 14),
            ),
            const SizedBox(height: 2),
            Text(
              _formatTime(message.createdAt),
              style: TextStyle(
                  color: isAdmin
                      ? Colors.grey
                      : Colors.white.withValues(alpha: 0.7),
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
