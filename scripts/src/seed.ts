import { db } from "@workspace/db";
import {
  categoriesTable,
  productsTable,
  usersTable,
  deliveryPersonsTable,
} from "@workspace/db/schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Seeding database...");

  const existingCategories = await db.select().from(categoriesTable).limit(1);
  if (existingCategories.length > 0) {
    console.log("Database already seeded, skipping...");
    process.exit(0);
  }

  const cats = await db.insert(categoriesTable).values([
    { name: "Vegetables", nameAr: "خضروات", icon: "🥦" },
    { name: "Fruits", nameAr: "فواكه", icon: "🍎" },
    { name: "Herbs", nameAr: "أعشاب", icon: "🌿" },
    { name: "Roots & Tubers", nameAr: "جذور ودرنات", icon: "🥕" },
    { name: "Leafy Greens", nameAr: "خضار ورقية", icon: "🥬" },
  ]).returning();

  const [vegetables, fruits, herbs, roots, leafy] = cats;

  await db.insert(productsTable).values([
    { name: "Fresh Tomatoes", nameAr: "طماطم طازجة", description: "Juicy red tomatoes, perfect for salads and cooking", descriptionAr: "طماطم حمراء طازجة مثالية للسلطات والطبخ", price: 12.5, unit: "kg", categoryId: vegetables.id, featured: true, inStock: true, image: "https://images.unsplash.com/photo-1546470427-227c8d90df58?w=400&auto=format&fit=crop" },
    { name: "Cucumber", nameAr: "خيار", description: "Crisp and refreshing cucumbers", descriptionAr: "خيار طازج ومنعش", price: 8.0, unit: "kg", categoryId: vegetables.id, featured: true, inStock: true, image: "https://images.unsplash.com/photo-1593288942460-e321b92a6cde?w=400&auto=format&fit=crop" },
    { name: "Bell Pepper", nameAr: "فلفل رومي", description: "Colorful sweet bell peppers", descriptionAr: "فلفل رومي ملون وحلو", price: 18.0, unit: "kg", categoryId: vegetables.id, featured: true, inStock: true, image: "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400&auto=format&fit=crop" },
    { name: "Eggplant", nameAr: "باذنجان", description: "Fresh purple eggplants", descriptionAr: "باذنجان بنفسجي طازج", price: 10.0, unit: "kg", categoryId: vegetables.id, featured: false, inStock: true, image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&auto=format&fit=crop" },
    { name: "Zucchini", nameAr: "كوسة", description: "Tender green zucchini", descriptionAr: "كوسة خضراء طرية", price: 9.5, unit: "kg", categoryId: vegetables.id, featured: false, inStock: true, image: "https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=400&auto=format&fit=crop" },
    { name: "Sweet Corn", nameAr: "ذرة حلوة", description: "Fresh sweet corn cobs", descriptionAr: "كيزان ذرة حلوة طازجة", price: 5.0, unit: "piece", categoryId: vegetables.id, featured: false, inStock: true, image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&auto=format&fit=crop" },
    { name: "Potatoes", nameAr: "بطاطس", description: "Starchy yellow potatoes, great for frying or boiling", descriptionAr: "بطاطس صفراء نشوية مثالية للقلي أو الغلي", price: 7.0, unit: "kg", categoryId: roots.id, featured: true, inStock: true, image: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&auto=format&fit=crop" },
    { name: "Carrots", nameAr: "جزر", description: "Sweet orange carrots", descriptionAr: "جزر برتقالي حلو", price: 6.5, unit: "kg", categoryId: roots.id, featured: true, inStock: true, image: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&auto=format&fit=crop" },
    { name: "Onions", nameAr: "بصل", description: "White and red onions", descriptionAr: "بصل أبيض وأحمر", price: 5.5, unit: "kg", categoryId: roots.id, featured: false, inStock: true, image: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400&auto=format&fit=crop" },
    { name: "Garlic", nameAr: "ثوم", description: "Fresh aromatic garlic bulbs", descriptionAr: "ثوم طازج عطري", price: 25.0, unit: "kg", categoryId: roots.id, featured: false, inStock: true, image: "https://images.unsplash.com/photo-1580201092675-a0a6a6cafbb1?w=400&auto=format&fit=crop" },
    { name: "Apples", nameAr: "تفاح", description: "Crisp and sweet apples", descriptionAr: "تفاح مقرمش وحلو", price: 20.0, unit: "kg", categoryId: fruits.id, featured: true, inStock: true, image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&auto=format&fit=crop" },
    { name: "Bananas", nameAr: "موز", description: "Ripe yellow bananas", descriptionAr: "موز أصفر ناضج", price: 15.0, unit: "kg", categoryId: fruits.id, featured: true, inStock: true, image: "https://images.unsplash.com/photo-1481349518771-20055b2a7b24?w=400&auto=format&fit=crop" },
    { name: "Oranges", nameAr: "برتقال", description: "Juicy sweet oranges, rich in Vitamin C", descriptionAr: "برتقال حلو وعصير غني بفيتامين سي", price: 18.0, unit: "kg", categoryId: fruits.id, featured: false, inStock: true, image: "https://images.unsplash.com/photo-1547514701-42782101795e?w=400&auto=format&fit=crop" },
    { name: "Strawberries", nameAr: "فراولة", description: "Fresh sweet strawberries", descriptionAr: "فراولة طازجة وحلوة", price: 35.0, unit: "kg", categoryId: fruits.id, featured: true, inStock: true, image: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400&auto=format&fit=crop" },
    { name: "Fresh Parsley", nameAr: "بقدونس", description: "Fresh flat-leaf parsley", descriptionAr: "بقدونس أوراق مسطحة طازج", price: 3.0, unit: "bundle", categoryId: herbs.id, featured: false, inStock: true, image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&auto=format&fit=crop" },
    { name: "Fresh Mint", nameAr: "نعناع", description: "Fragrant fresh mint leaves", descriptionAr: "أوراق نعناع طازجة وعطرية", price: 3.0, unit: "bundle", categoryId: herbs.id, featured: false, inStock: true, image: "https://images.unsplash.com/photo-1628557044797-f21a177c37ec?w=400&auto=format&fit=crop" },
    { name: "Coriander", nameAr: "كزبرة", description: "Fresh coriander leaves", descriptionAr: "أوراق كزبرة طازجة", price: 3.0, unit: "bundle", categoryId: herbs.id, featured: false, inStock: true, image: "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&auto=format&fit=crop" },
    { name: "Lettuce", nameAr: "خس", description: "Crisp iceberg lettuce", descriptionAr: "خس أيسبرج مقرمش", price: 6.0, unit: "piece", categoryId: leafy.id, featured: false, inStock: true, image: "https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400&auto=format&fit=crop" },
    { name: "Spinach", nameAr: "سبانخ", description: "Fresh baby spinach leaves", descriptionAr: "أوراق سبانخ صغيرة طازجة", price: 8.0, unit: "bundle", categoryId: leafy.id, featured: false, inStock: true, image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&auto=format&fit=crop" },
  ]);

  const adminPassword = await bcrypt.hash("admin123", 10);
  await db.insert(usersTable).values([
    { name: "Admin", phone: "01000000000", password: adminPassword, role: "admin" },
  ]);

  const deliveryPassword = await bcrypt.hash("delivery123", 10);
  await db.insert(deliveryPersonsTable).values([
    { name: "Ahmed Hassan", phone: "01111111111", active: true, username: "ahmed", password: deliveryPassword },
    { name: "Mohamed Ali", phone: "01222222222", active: true, username: "mohamed", password: deliveryPassword },
    { name: "Khaled Ibrahim", phone: "01333333333", active: true, username: "khaled", password: deliveryPassword },
  ]);

  console.log("✅ Seeding complete!");
  console.log("Admin login: phone=01000000000 password=admin123");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
