class ChatMessage {
  final int id;
  final int? senderId;
  final String? senderName;
  final String content;
  final String createdAt;
  final bool isFromAdmin;
  final String? mediaUrl;

  const ChatMessage({
    required this.id,
    this.senderId,
    this.senderName,
    required this.content,
    required this.createdAt,
    required this.isFromAdmin,
    this.mediaUrl,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
        id: json['id'] as int,
        senderId: json['senderId'] as int?,
        senderName: json['senderName'] as String?,
        content: json['content'] as String? ?? '',
        createdAt: json['createdAt'] as String? ?? '',
        isFromAdmin: json['isFromAdmin'] as bool? ?? false,
        mediaUrl: json['mediaUrl'] as String?,
      );
}

class Reaction {
  final String emoji;
  final int count;

  const Reaction({required this.emoji, required this.count});

  factory Reaction.fromJson(MapEntry<String, dynamic> entry) =>
      Reaction(emoji: entry.key, count: entry.value as int? ?? 0);
}

class FeedPost {
  final int id;
  final String content;
  final String createdAt;
  final String? mediaUrl;
  final Map<String, int> reactions;
  final String? authorName;

  const FeedPost({
    required this.id,
    required this.content,
    required this.createdAt,
    this.mediaUrl,
    this.reactions = const {},
    this.authorName,
  });

  factory FeedPost.fromJson(Map<String, dynamic> json) => FeedPost(
        id: json['id'] as int,
        content: json['content'] as String? ?? '',
        createdAt: json['createdAt'] as String? ?? '',
        mediaUrl: json['mediaUrl'] as String?,
        reactions: (json['reactions'] as Map<String, dynamic>?)
                ?.map((k, v) => MapEntry(k, (v as num).toInt())) ??
            {},
        authorName: json['authorName'] as String?,
      );
}

class Conversation {
  final int customerId;
  final String customerName;
  final String? lastMessage;
  final String? lastMessageAt;
  final int unreadCount;

  const Conversation({
    required this.customerId,
    required this.customerName,
    this.lastMessage,
    this.lastMessageAt,
    this.unreadCount = 0,
  });

  factory Conversation.fromJson(Map<String, dynamic> json) => Conversation(
        customerId: json['customerId'] as int? ?? json['id'] as int,
        customerName: json['customerName'] as String? ??
            json['name'] as String? ??
            '',
        lastMessage: json['lastMessage'] as String?,
        lastMessageAt: json['lastMessageAt'] as String?,
        unreadCount: json['unreadCount'] as int? ?? 0,
      );
}
