import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/category.dart';
import '../../services/api_client.dart';
import '../../widgets/empty_state.dart';
import 'admin_shell.dart';

final _categoriesListProvider = FutureProvider<List<Category>>((ref) async {
  final res = await apiClient.get('/categories');
  return (res.data as List).map((e) => Category.fromJson(e)).toList();
});

class AdminCategoriesScreen extends ConsumerWidget {
  const AdminCategoriesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final catsAsync = ref.watch(_categoriesListProvider);

    return Scaffold(
      appBar: AdminAppBar(
        title: 'Categories',
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _openForm(context, ref),
          ),
        ],
      ),
      body: catsAsync.when(
        data: (cats) => cats.isEmpty
            ? const EmptyState(message: 'No categories found')
            : ListView.builder(
                padding: const EdgeInsets.all(12),
                itemCount: cats.length,
                itemBuilder: (_, i) {
                  final c = cats[i];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: Text(c.icon ?? '🌿',
                          style: const TextStyle(fontSize: 28)),
                      title: Text(c.name,
                          style: const TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: Text(c.nameAr),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.edit_outlined, size: 20),
                            onPressed: () => _openForm(context, ref, cat: c),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline,
                                size: 20, color: Colors.red),
                            onPressed: () => _delete(context, ref, c.id),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }

  void _openForm(BuildContext context, WidgetRef ref, {Category? cat}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _CategoryForm(
        category: cat,
        onSaved: () {
          ref.invalidate(_categoriesListProvider);
          Navigator.of(context).pop();
        },
      ),
    );
  }

  Future<void> _delete(BuildContext context, WidgetRef ref, int id) async {
    final ok = await showDialog<bool>(
          context: context,
          builder: (_) => AlertDialog(
            title: const Text('Delete Category'),
            content: const Text('Delete this category?'),
            actions: [
              TextButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  child: const Text('Cancel')),
              TextButton(
                  onPressed: () => Navigator.of(context).pop(true),
                  child: const Text('Delete',
                      style: TextStyle(color: Colors.red))),
            ],
          ),
        ) ??
        false;
    if (!ok) return;
    try {
      await apiClient.delete('/categories/$id');
      ref.invalidate(_categoriesListProvider);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }
}

class _CategoryForm extends StatefulWidget {
  final Category? category;
  final VoidCallback onSaved;

  const _CategoryForm({this.category, required this.onSaved});

  @override
  State<_CategoryForm> createState() => _CategoryFormState();
}

class _CategoryFormState extends State<_CategoryForm> {
  final _formKey = GlobalKey<FormState>();
  late final _nameCtrl = TextEditingController(text: widget.category?.name ?? '');
  late final _nameArCtrl = TextEditingController(text: widget.category?.nameAr ?? '');
  late final _iconCtrl = TextEditingController(text: widget.category?.icon ?? '');
  bool _loading = false;

  @override
  void dispose() {
    _nameCtrl.dispose(); _nameArCtrl.dispose(); _iconCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      final data = {
        'name': _nameCtrl.text.trim(),
        'nameAr': _nameArCtrl.text.trim(),
        'icon': _iconCtrl.text.trim(),
      };
      if (widget.category != null) {
        await apiClient.put('/categories/${widget.category!.id}', data: data);
      } else {
        await apiClient.post('/categories', data: data);
      }
      widget.onSaved();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                  widget.category == null ? 'Add Category' : 'Edit Category',
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              TextFormField(
                controller: _nameCtrl,
                decoration: const InputDecoration(labelText: 'Name (EN)'),
                validator: (v) => v?.isEmpty == true ? 'Required' : null,
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _nameArCtrl,
                decoration: const InputDecoration(labelText: 'Name (AR)'),
                textDirection: TextDirection.rtl,
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _iconCtrl,
                decoration: const InputDecoration(
                    labelText: 'Icon (emoji)',
                    hintText: '🥦'),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _loading ? null : _save,
                  child: _loading
                      ? const SizedBox(
                          height: 20, width: 20,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : Text(widget.category == null ? 'Add' : 'Save'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
