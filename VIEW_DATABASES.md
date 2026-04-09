# View and Manage All Your Databases

This guide will help you find, view, and manage all databases used by your Veggie-Cart project.

## 🚀 Quick Start

### Step 1: Find All Databases
```bash
git pull origin main
pnpm --filter @workspace/scripts run find-databases
```

This will show you:
- ✅ All databases found in your project
- ✅ Number of tables in each database
- ✅ Total row count
- ✅ Sample data from each table

---

## 🔍 Database Discovery Tools

### 1. `find-databases` - Find All Databases
**What it does:**
- Searches for all database URLs in your project
- Tests connections to each database
- Shows table counts and row counts
- Displays sample data

**Usage:**
```bash
pnpm --filter @workspace/scripts run find-databases
```

**Output Example:**
```
🔍 Searching for all databases used by your project...

📊 Found Databases:

1. .env DATABASE_URL
   Type: PostgreSQL
   Connection: postgresql://neondb_owner:***@ep-plain-mountain-ak8dgqxa.c-3.us-west-2.aws.neon.tech/neondb

🔄 Connecting to databases...

✅ Database Summary:

1. .env DATABASE_URL
   Tables: 8
   Total Rows: 145

📝 Sample Data from Main Database:

   📂 users:
      Columns: id, name, email, phone, password, role, ...
      Sample: { 1, 'Gamal', 'gamal@email.com', '+201xxxxxxxxx', '***', 'admin', ... }
```

---

### 2. `check-db` - Detailed Database Inspection
**What it does:**
- Connects to a specific database
- Lists all tables with row counts
- Shows detailed sample data
- Great for verifying database setup

**Usage:**
```bash
pnpm --filter @workspace/scripts run check-db
```

**Output Example:**
```
🔍 Checking Replit Database
📍 Connection: postgresql://repl_admin:***@localhost:5432/veggie_cart

✅ Connected to database

📊 Tables in Database:
   ✅ users
      └─ users: 5 rows
   ✅ products
      └─ products: 20 rows
   ✅ orders
      └─ orders: 15 rows

📝 Sample from users:
   Columns: id, name, email, phone, password, role, createdAt, updatedAt
   Data: 1, Gamal, gamal@email.com, +201xxxxxxxxx, my_secu***, admin, ..., ...
```

---

### 3. `migrate-data` - Copy Data Between Databases
**What it does:**
- Migrates data from one database to another
- Automatically sanitizes sensitive data (passwords)
- Uses UPSERT to update existing records
- Handles large datasets efficiently

**Usage:**
```bash
# Set source database URL
export LOCAL_DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# Run migration
pnpm --filter @workspace/scripts run migrate-data
```

**Tables Migrated:**
- users (passwords are redacted)
- products
- orders
- order_items
- categories
- promo_codes
- vouchers
- delivery_settings
- store_settings

---

## 📍 Where to Find Database Credentials

### In Your `.env` File
Open `.env` in your project root:

```bash
# Local development database
DATABASE_URL=postgresql://neondb_owner:npg_XXXXXX@ep-xxx.us-west-2.aws.neon.tech/neondb?sslmode=require

# For Replit (if you add it)
DATABASE_URL=postgresql://repl_admin:password@localhost:5432/veggie_cart

# For migration
LOCAL_DATABASE_URL=postgresql://your-username:password@localhost:5432/dbname
```

### In Replit Environment
1. Open Replit
2. Click Settings (gear icon)
3. Click Environment tab
4. Look for `DATABASE_URL` variable

---

## 🔎 Understanding Your Current Database

### What We Found

From your `.env` file, we found:

```
DATABASE_URL=postgresql://neondb_owner:npg_JZo1MCxat8GV@ep-plain-mountain-ak8dgqxa.c-3.us-west-2.aws.neon.tech/neondb?sslmode=require
```

This means:
- ✅ **Provider:** Neon.tech (Cloud PostgreSQL)
- ✅ **Username:** neondb_owner
- ✅ **Database:** neondb
- ✅ **Host:** ep-plain-mountain-ak8dgqxa.c-3.us-west-2.aws.neon.tech
- ✅ **Port:** 5432 (default)
- ✅ **SSL Required:** Yes

---

## 📊 Typical Database Structure

After running `check-db` or `find-databases`, you should see these tables:

| Table | Description | Typical Rows |
|-------|-------------|--------------|
| `users` | User accounts | 1-100 |
| `products` | Product inventory | 10-500 |
| `orders` | Customer orders | 1-1000 |
| `order_items` | Order line items | 10-5000 |
| `categories` | Product categories | 5-50 |
| `promo_codes` | Discount codes | 1-20 |
| `vouchers` | User discount vouchers | 0-100 |
| `delivery_settings` | Delivery fee config | 1 |
| `store_settings` | Store info | 1 |

---

## 🛠️ Common Operations

### View Data in a Table

#### Using psql (if PostgreSQL is installed):
```bash
psql $DATABASE_URL -c "SELECT * FROM users LIMIT 5;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM products;"
```

#### Using the check-db script:
```bash
pnpm --filter @workspace/scripts run check-db
```

### Inspect Schema

```bash
# Show all columns in a table
psql $DATABASE_URL -c "\d users"

# Show table structure
psql $DATABASE_URL -c "\d+ products"
```

### Count Records

```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM orders WHERE status = 'completed';"
```

### Export to CSV

```bash
psql $DATABASE_URL -c "\COPY products TO '/tmp/products.csv' DELIMITER ',' CSV HEADER"
```

---

## 🔄 Workflow: Migrate Data to Replit

### Scenario: You have data on Neon, want it on Replit

1. **Pull latest code:**
   ```bash
   git pull origin main
   ```

2. **Run database check:**
   ```bash
   pnpm --filter @workspace/scripts run find-databases
   ```

3. **Set Replit DATABASE_URL** (if not already set):
   - Go to Replit Settings → Environment
   - Add: `DATABASE_URL=postgresql://repl_admin:password@localhost:5432/veggie_cart`
   - Restart Replit

4. **Verify tables are created on Replit:**
   ```bash
   pnpm --filter @workspace/scripts run check-db
   ```

5. **Migrate data (if tables are empty):**
   ```bash
   export LOCAL_DATABASE_URL="postgresql://neondb_owner:password@ep-xxx.neon.tech/neondb"
   pnpm --filter @workspace/scripts run migrate-data
   ```

---

## 🎯 What to Do Next

### If Your Replit Database is Empty
Run:
```bash
pnpm --filter @workspace/scripts run setup-db
```

### If Your Replit Database Has Tables but No Data
Run:
```bash
pnpm --filter @workspace/scripts run migrate-data
```

### If You Want to Verify Data
Run:
```bash
pnpm --filter @workspace/scripts run check-db
```

---

## 📝 Quick Reference

| Command | Purpose |
|---------|---------|
| `find-databases` | Find all databases in your project |
| `check-db` | Inspect specific database details |
| `setup-db` | Create database tables |
| `migrate-data` | Copy data between databases |

---

## 💡 Tips

1. **Always use .env files:** Don't hardcode database passwords
2. **Keep LOCAL_DATABASE_URL for migration only:** It's not needed in production
3. **Check sample data first:** Always verify data before deploying
4. **Backup before migration:** Copy your local database before making changes
5. **Test in development first:** Run on Replit to test before production

---

## ❓ Troubleshooting

### "DATABASE_URL not found"
- Make sure `.env` file is in project root
- Set environment variable in Replit Settings → Environment
- Restart Replit after changing environment variables

### "Connection refused"
- Database is running (check PostgreSQL service)
- Connection string is correct
- Firewall allows localhost connections

### "Authentication failed"
- Check username and password
- Make sure no spaces in connection string
- Reset database password if needed

---

## 🔗 Useful Links

- **Neon Documentation:** https://neon.tech/docs
- **PostgreSQL Connection Strings:** https://www.postgresql.org/docs/current/libpq-connect.html
- **Drizzle ORM:** https://orm.drizzle.team/docs/get-started-postgresql

---

**Ready to explore your database? Run `pnpm --filter @workspace/scripts run find-databases`!** 🚀