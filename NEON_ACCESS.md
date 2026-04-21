# Access Your Neon Database Online

This guide will help you view your database data directly on the Neon website (neon.tech).

---

## 🚀 Quick Access to Neon

### Step 1: Login to Neon
1. Go to: **https://console.neon.tech**
2. Login with your GitHub account (Neon uses GitHub OAuth)

### Step 2: Select Your Project
1. You should see your project: `neondb` or `Veggie-Cart` or similar
2. Click on your project to open it

---

## 📊 View Your Database

### Option 1: SQL Editor (Recommended)
1. Click the **"SQL Editor"** tab
2. Run SQL queries to view your data

#### Example Queries:

**See all tables:**
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Count rows in each table:**
```sql
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
```

**See users:**
```sql
SELECT * FROM users;
```

**See products:**
```sql
SELECT * FROM products LIMIT 20;
```

**See orders:**
```sql
SELECT * FROM orders LIMIT 10;
```

**Get row count:**
```sql
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as total_products FROM products;
SELECT COUNT(*) as total_orders FROM orders;
```

---

### Option 2: Table Viewer
1. Go to your project in Neon console
2. Click the **"Object Browser"** or **"Database"** tab
3. Click on each table to expand and see rows
4. Navigate through pages with "Next" / "Previous" buttons

---

### Option 3: Data Grid
1. Select a table from the object browser
2. Data is displayed in a grid format
3. Use pagination to browse large datasets
4. Click on rows to see full details

---

## 🔍 Example: See All Your Data

### See All Tables and Their Counts
```sql
SELECT
  table_name,
  (SELECT COUNT(*) FROM users WHERE email = 'neondb_owner') as owner_count
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

### See Most Recent Orders
```sql
SELECT
  id,
  customer_name,
  customer_phone,
  total_price,
  status,
  created_at
FROM orders
ORDER BY created_at DESC
LIMIT 20;
```

### See Products
```sql
SELECT
  id,
  name,
  name_ar,
  price,
  quantity,
  category_id,
  created_at
FROM products
ORDER BY created_at DESC
LIMIT 20;
```

### See Users
```sql
SELECT
  id,
  name,
  email,
  phone,
  role,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 20;
```

---

## 📱 Neon Mobile App (Optional)

Neon has a mobile app for managing databases:

1. **Download:** https://neon.tech/docs/get-started

2. **Login:** Use your GitHub account

3. **View Data:**
   - Connect to your Neon instance
   - Browse tables
   - Run SQL queries

---

## 🛠️ Useful SQL Queries

### 1. Get Summary of All Tables
```sql
SELECT
  t.table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count,
  (SELECT COUNT(*) FROM pg_stats WHERE tablename = t.table_name AND schemaname = 'public') as row_count
FROM information_schema.tables t
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;
```

### 2. Find Products with Low Stock
```sql
SELECT
  id,
  name,
  quantity,
  price,
  price - (price * 0.3) as discount_price
FROM products
WHERE quantity < 10
ORDER BY quantity ASC;
```

### 3. Get Order Statistics
```sql
SELECT
  status,
  COUNT(*) as count,
  AVG(total_price) as average_order_value
FROM orders
GROUP BY status;
```

### 4. See Today's Orders
```sql
SELECT
  id,
  customer_name,
  total_price,
  status,
  created_at
FROM orders
WHERE DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;
```

---

## 🔗 Direct Connection String

To connect from your local machine or other tools, your connection string is:

```
postgresql://neondb_owner:npg_JZo1MCxat8GV@ep-plain-mountain-ak8dgqxa.c-3.us-west-2.aws.neon.tech/neondb?sslmode=require
```

You can use this with:
- **pgAdmin** (GUI tool)
- **DBeaver** (GUI tool)
- **TablePlus** (Mac/Windows GUI)
- **psql** (command line)

---

## 💾 Export Your Data

### Export as CSV
1. In Neon SQL Editor
2. Run:
   ```sql
   COPY (SELECT * FROM users) TO STDOUT WITH CSV HEADER;
   ```

### Export as JSON
1. Right-click on table in Object Browser
2. Select "Export"
3. Choose format (CSV, JSON, SQL)

---

## 🔐 Access Your Database URL in Neon

1. Go to your Neon project
2. Click **"Settings"** tab
3. Find **"Connection string"** section
4. Copy the full connection string

It looks like:
```
postgresql://username:password@endpoint.db.neon.tech/database?sslmode=require
```

---

## 📱 Checking Neon Status

### Check if Neon is Running
1. In Neon console
2. You'll see a status indicator (green = running, red = stopped)
3. If red, click "Start" or "Start Instance"

### Check Connection
1. In SQL Editor
2. Run:
   ```sql
   SELECT version();
   ```
3. If it returns the PostgreSQL version, connection is working

---

## 🔄 Syncing Data Between Neon and Replit

### Method 1: Run Migration Script
```bash
# In Replit
export LOCAL_DATABASE_URL="postgresql://neondb_owner:password@ep-xxx.neon.tech/neondb"
pnpm --filter @workspace/scripts run migrate-data
```

### Method 2: Use Neon Connection
1. Copy Neon connection string
2. Set in Replit: `DATABASE_URL=postgresql://neondb_owner:password@ep-xxx.neon.tech/neondb`
3. Replit will use your Neon database directly

---

## ❓ Troubleshooting

### "Database not found" or "Project not found"
- Check you're logged in to the correct GitHub account
- Go to Neon console and select the right project
- Neon has projects for each database instance

### "Connection failed"
- Verify the connection string is correct
- Copy it directly from Neon console (Settings → Connection string)
- Make sure `sslmode=require` is included

### "No tables found"
- Your database might be empty
- Run `pnpm --filter @workspace/scripts run setup-db` to create tables

### "Authentication failed"
- Check username and password
- Reset password in Neon console if needed

---

## 🎯 Quick Summary

| What You Want | How to Do It |
|---------------|-------------|
| **View tables** | Object Browser in Neon console |
| **Run SQL queries** | SQL Editor tab |
| **See all data** | Run `SELECT * FROM table_name;` |
| **Count rows** | Run `SELECT COUNT(*) FROM table_name;` |
| **Export data** | Right-click table → Export |
| **Get connection string** | Settings → Connection string |

---

**Ready to access your data? Go to https://console.neon.tech now!** 🚀