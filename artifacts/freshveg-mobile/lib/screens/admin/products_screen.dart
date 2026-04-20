import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:dio/dio.dart';
import 'dart:io';
import '../../config/theme.dart';
import '../../models/product.dart';
import '../../models/category.dart';
import '../../services/api_client.dart';
import '../../widgets/empty_state.dart';
import 'admin_shell.dart';

final _allProductsProvider = FutureProvider<List<Product>>((ref) async {
  final res = await apiClient.get('/products');
  return (res.data as List).map((e) => Product.fromJson(e)).toList();
});

final _allCatsProvider = FutureProvider<List<Category>>((ref) async {
  final res = await apiClient.get('/categories');
  return (res.data as List).map((e) => Category.fromJson(e)).toList();
});

class AdminProductsScreen extends ConsumerStatefulWidget {
  const AdminProductsScreen({super.key});

  @override
  ConsumerState<AdminProductsScreen> createState() => _AdminProductsScreenState();
}

class _AdminProductsScreenState extends ConsumerState<AdminProductsScreen> {
  String _search = '';

  Future<void> _delete(int id) async {
    final ok = await showDialog<bool>(
          context: context,
          builder: (_) => AlertDialog(
            title: const Text('Delete Product'),
            content: const Text('Are you sure you want to delete this product?'),
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
      await apiClient.delete('/products/$id');
      ref.invalidate(_allProductsProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _openForm({Product? product}) {
    final cats = ref.read(_allCatsProvider).valueOrNull ?? [];
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _ProductForm(
        product: product,
        categories: cats,
        onSaved: () {
          ref.invalidate(_allProductsProvider);
          Navigator.of(context).pop();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final productsAsync = ref.watch(_allProductsProvider);

    return Scaffold(
      appBar: AdminAppBar(
        title: 'Products',
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _openForm(),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              decoration: const InputDecoration(
                hintText: 'Search products…',
                prefixIcon: Icon(Icons.search),
                filled: true,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.all(Radius.circular(12)),
                  borderSide: BorderSide.none,
                ),
                contentPadding: EdgeInsets.symmetric(vertical: 8),
              ),
              onChanged: (v) => setState(() => _search = v),
            ),
          ),
          Expanded(
            child: productsAsync.when(
              data: (products) {
                final filtered = _search.isEmpty
                    ? products
                    : products
                        .where((p) =>
                            p.name.toLowerCase().contains(_search.toLowerCase()) ||
                            p.nameAr.contains(_search))
                        .toList();
                return filtered.isEmpty
                    ? const EmptyState(message: 'No products found')
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        itemCount: filtered.length,
                        itemBuilder: (_, i) {
                          final p = filtered[i];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              leading: Container(
                                width: 48,
                                height: 48,
                                decoration: BoxDecoration(
                                  color: kPrimaryGreen.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Icon(Icons.eco, color: kPrimaryGreen),
                              ),
                              title: Text(p.name,
                                  style: const TextStyle(fontWeight: FontWeight.w600)),
                              subtitle: Text(
                                'EGP ${p.price.toStringAsFixed(2)} / ${p.unit}  •  ${p.inStock ? 'In Stock' : 'Out of Stock'}',
                              ),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  IconButton(
                                    icon: const Icon(Icons.edit_outlined, size: 20),
                                    onPressed: () => _openForm(product: p),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.delete_outline,
                                        size: 20, color: Colors.red),
                                    onPressed: () => _delete(p.id),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Error: $e')),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProductForm extends StatefulWidget {
  final Product? product;
  final List<Category> categories;
  final VoidCallback onSaved;

  const _ProductForm({this.product, required this.categories, required this.onSaved});

  @override
  State<_ProductForm> createState() => _ProductFormState();
}

class _ProductFormState extends State<_ProductForm> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name = TextEditingController(text: widget.product?.name ?? '');
  late final TextEditingController _nameAr = TextEditingController(text: widget.product?.nameAr ?? '');
  late final TextEditingController _price = TextEditingController(text: widget.product?.price.toString() ?? '');
  late final TextEditingController _desc = TextEditingController(text: widget.product?.description ?? '');
  late final TextEditingController _qty = TextEditingController(text: widget.product?.quantity?.toString() ?? '');
  String _unit = 'piece';
  int? _categoryId;
  bool _featured = false;
  bool _inStock = true;
  bool _loading = false;
  File? _imageFile;

  @override
  void initState() {
    super.initState();
    _unit = widget.product?.unit ?? 'piece';
    _categoryId = widget.product?.categoryId;
    _featured = widget.product?.featured ?? false;
    _inStock = widget.product?.inStock ?? true;
  }

  @override
  void dispose() {
    _name.dispose(); _nameAr.dispose(); _price.dispose();
    _desc.dispose(); _qty.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final img = await picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (img != null) setState(() => _imageFile = File(img.path));
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      final data = FormData.fromMap({
        'name': _name.text.trim(),
        'nameAr': _nameAr.text.trim(),
        'price': double.parse(_price.text.trim()),
        'unit': _unit,
        'featured': _featured,
        'inStock': _inStock,
        'description': _desc.text.trim(),
        if (_categoryId != null) 'categoryId': _categoryId,
        if (_qty.text.isNotEmpty) 'quantity': int.tryParse(_qty.text),
        if (_imageFile != null)
          'images': await MultipartFile.fromFile(_imageFile!.path),
      });
      if (widget.product != null) {
        await apiClient.postFormData('/products/${widget.product!.id}', data);
      } else {
        await apiClient.postFormData('/products', data);
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
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(widget.product == null ? 'Add Product' : 'Edit Product',
                      style: const TextStyle(
                          fontSize: 18, fontWeight: FontWeight.bold)),
                  IconButton(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.close)),
                ],
              ),
              const SizedBox(height: 16),
              GestureDetector(
                onTap: _pickImage,
                child: Container(
                  height: 100,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey.shade300),
                  ),
                  child: _imageFile != null
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(11),
                          child: Image.file(_imageFile!, fit: BoxFit.cover),
                        )
                      : const Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.add_photo_alternate_outlined,
                                  size: 32, color: Colors.grey),
                              SizedBox(height: 4),
                              Text('Add Photo',
                                  style: TextStyle(color: Colors.grey)),
                            ],
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _name,
                decoration: const InputDecoration(labelText: 'Name (EN)'),
                validator: (v) => v?.isEmpty == true ? 'Required' : null,
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _nameAr,
                decoration: const InputDecoration(labelText: 'Name (AR)'),
                textDirection: TextDirection.rtl,
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _price,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Price (EGP)'),
                      validator: (v) =>
                          double.tryParse(v ?? '') == null ? 'Required' : null,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _unit,
                      decoration: const InputDecoration(labelText: 'Unit'),
                      items: ['piece', 'kg', 'bunch', 'liter', 'box']
                          .map((u) => DropdownMenuItem(value: u, child: Text(u)))
                          .toList(),
                      onChanged: (v) => setState(() => _unit = v!),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<int>(
                value: _categoryId,
                decoration: const InputDecoration(labelText: 'Category'),
                items: widget.categories
                    .map((c) =>
                        DropdownMenuItem(value: c.id, child: Text(c.name)))
                    .toList(),
                onChanged: (v) => setState(() => _categoryId = v),
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _qty,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Stock Quantity'),
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _desc,
                decoration: const InputDecoration(labelText: 'Description'),
                maxLines: 2,
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: CheckboxListTile(
                      title: const Text('Featured'),
                      value: _featured,
                      onChanged: (v) => setState(() => _featured = v!),
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),
                  Expanded(
                    child: CheckboxListTile(
                      title: const Text('In Stock'),
                      value: _inStock,
                      onChanged: (v) => setState(() => _inStock = v!),
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _loading ? null : _save,
                  child: _loading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : Text(widget.product == null ? 'Add Product' : 'Save Changes'),
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }
}
