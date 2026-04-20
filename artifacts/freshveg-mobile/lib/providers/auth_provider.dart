import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/user.dart';
import '../services/auth_service.dart';

class AuthState {
  final AppUser? user;
  final bool isLoading;
  final String? error;

  const AuthState({this.user, this.isLoading = false, this.error});

  bool get isLoggedIn => user != null;
  String get role => user?.role ?? '';

  AuthState copyWith({AppUser? user, bool? isLoading, String? error}) =>
      AuthState(
        user: user ?? this.user,
        isLoading: isLoading ?? this.isLoading,
        error: error,
      );
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState(isLoading: true)) {
    _init();
  }

  Future<void> _init() async {
    final user = await AuthService.getMe();
    state = AuthState(user: user);
  }

  Future<bool> loginCustomer(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final data = await AuthService.loginCustomer(email: email, password: password);
      final user = AppUser.fromJson(data['user'] as Map<String, dynamic>);
      state = AuthState(user: user);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<bool> signup(String name, String email, String password, String phone) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final data = await AuthService.signupCustomer(
          name: name, email: email, password: password, phone: phone);
      final user = AppUser.fromJson(data['user'] as Map<String, dynamic>);
      state = AuthState(user: user);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<bool> loginAdmin(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final data = await AuthService.loginAdmin(email: email, password: password);
      final user = AppUser.fromJson(data['user'] as Map<String, dynamic>);
      state = AuthState(user: user);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<bool> loginDelivery(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final data = await AuthService.loginDelivery(email: email, password: password);
      final user = AppUser.fromJson(data['user'] as Map<String, dynamic>);
      state = AuthState(user: user);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<void> logout() async {
    await AuthService.logout();
    state = const AuthState();
  }

  void setUser(AppUser user) => state = state.copyWith(user: user);
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>(
  (ref) => AuthNotifier(),
);
