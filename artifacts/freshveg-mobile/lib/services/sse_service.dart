import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

/// Lightweight SSE client that connects to `/api/notifications/stream`
/// and emits parsed JSON events via [stream].
///
/// Usage:
///   final svc = SseService(token: jwtToken);
///   svc.stream.listen((event) { ... });
///   svc.dispose(); // cleanup
class SseService {
  final String token;
  StreamController<Map<String, dynamic>>? _ctrl;
  http.Client? _client;
  bool _disposed = false;

  SseService({required this.token}) {
    _ctrl = StreamController<Map<String, dynamic>>.broadcast();
    _connect();
  }

  Stream<Map<String, dynamic>> get stream => _ctrl!.stream;

  void _connect() async {
    _client = http.Client();
    final uri = Uri.parse('$kApiUrl/notifications/stream?token=$token');
    try {
      final request = http.Request('GET', uri)
        ..headers['Accept'] = 'text/event-stream'
        ..headers['Cache-Control'] = 'no-cache';

      final response = await _client!.send(request);
      if (_disposed) return;

      final stream = response.stream
          .transform(utf8.decoder)
          .transform(const LineSplitter());

      final StringBuffer dataBuffer = StringBuffer();

      await for (final line in stream) {
        if (_disposed) break;
        if (line.startsWith('data:')) {
          final data = line.substring(5).trim();
          if (data.isNotEmpty) dataBuffer.write(data);
        } else if (line.isEmpty && dataBuffer.isNotEmpty) {
          // Dispatch accumulated data
          try {
            final json = jsonDecode(dataBuffer.toString());
            if (json is Map<String, dynamic> && !_ctrl!.isClosed) {
              _ctrl!.add(json);
            }
          } catch (e) {
            debugPrint('[SSE] parse error: $e');
          }
          dataBuffer.clear();
        }
      }
    } catch (e) {
      if (!_disposed) {
        debugPrint('[SSE] connection error: $e — reconnecting in 5s');
        await Future.delayed(const Duration(seconds: 5));
        if (!_disposed) _connect();
      }
    }
  }

  void dispose() {
    _disposed = true;
    _client?.close();
    _ctrl?.close();
  }
}
