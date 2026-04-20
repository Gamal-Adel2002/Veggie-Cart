import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/user.dart';
import 'api_client.dart';

const _storage = FlutterSecureStorage();

class AuthService {
  static Future<Map<String, dynamic>> loginCustomer({
    required String email,
    required String password,
  }) async {
    final res = await apiClient.post('/auth/login', data: {
      'email': email,
      'password': password,
    });
    final token = res.data['token'] as String?;
    if (token != null) await ApiClient.saveToken(token);
    return res.data as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> signupCustomer({
    required String name,
    required String email,
    required String password,
    required String phone,
  }) async {
    final res = await apiClient.post('/auth/signup', data: {
      'name': name,
      'email': email,
      'password': password,
      'phone': phone,
    });
    final token = res.data['token'] as String?;
    if (token != null) await ApiClient.saveToken(token);
    return res.data as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> loginAdmin({
    required String email,
    required String password,
  }) async {
    final res = await apiClient.post('/auth/admin/login', data: {
      'email': email,
      'password': password,
    });
    final token = res.data['token'] as String?;
    if (token != null) await ApiClient.saveToken(token);
    return res.data as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> loginDelivery({
    required String email,
    required String password,
  }) async {
    final res = await apiClient.post('/delivery-portal/login', data: {
      'email': email,
      'password': password,
    });
    final token = res.data['token'] as String?;
    if (token != null) await ApiClient.saveToken(token);
    return res.data as Map<String, dynamic>;
  }

  static Future<void> logout() async {
    try {
      await apiClient.post('/auth/logout');
    } catch (_) {}
    await ApiClient.deleteToken();
    await _storage.delete(key: 'user_role');
    await _storage.delete(key: 'user_id');
  }

  static Future<AppUser?> getMe() async {
    try {
      final res = await apiClient.get('/auth/me');
      return AppUser.fromJson(res.data as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  static Future<void> saveRole(String role) =>
      _storage.write(key: 'user_role', value: role);

  static Future<String?> getRole() => _storage.read(key: 'user_role');
}
