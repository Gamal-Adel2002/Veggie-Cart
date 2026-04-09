# Migrate Local Database to Replit

This guide will help you migrate your local database data (users, products, orders, etc.) to your Replit database.

## Quick Start

```bash
# 1. Pull the latest changes from GitHub
git pull origin main

# 2. Install dependencies
pnpm install

# 3. Set environment variables
# In Replit terminal, set:
export LOCAL_DATABASE_URL="postgresql://your-localhost-user:password@localhost:5432/your-db-name"
# DATABASE_URL is already set (from Replit environment)

# 4. Run the migration
pnpm --filter @workspace/scripts run migrate-data
```

---

## Step-by-Step Instructions

### Step 1: Get Your Local Database Connection String

Find your local database connection string from your `.env` file:

```
DATABASE_URL=postgresql://user:password@localhost:5432/veggie_cart
```

**Note:** This might be slightly different for your local setup:
- Change `localhost` to `127.0.0.1` if that's what you use
- The password might be different than in Replit
- The database name might be different

### Step 2: Set Environment Variables

#### Option A: In Replit Terminal (Temporary)

```bash
export LOCAL_DATABASE_URL="postgresql://your-localhost-user:password@localhost:5432/your-db-name"
pnpm --filter @workspace/scripts run migrate-data
```

#### Option B: In .env File (Persistent)

1. Create or edit `.env` file in the root directory
2. Add:
   ```
   LOCAL_DATABASE_URL=postgresql://your-localhost-user:password@localhost:5432/your-db-name
   ```
3. Commit to git (but **don't** commit the password in plain text to GitHub!)
   ```bash
   git add .env
   git commit -m "Add local database URL for migration"
   git push origin main
   ```

### Step 3: Run the Migration

```bash
pnpm --filter @workspace/scripts run migrate-data
```

You'll see output like:
```
🚀 Data Migration Script

📍 Source: postgresql://localhost:5432/veggie_cart
📍 Destination: postgresql://repl_admin:password@localhost:5432/veggie_cart

🔄 Testing connections...
   ✅ Local database connected
   ✅ Replit database connected

📥 Migrating table: users
   Found 5 rows in users
   ✅ Successfully migrated 5 rows to users

📥 Migrating table: products
   Found 20 rows in products
   ✅ Successfully migrated 20 rows to products

✅ Data migration completed successfully!
```

### Step 4: Verify the Migration

1. **Check in Replit Database tab**
   - Go to the Database tab in Replit
   - Click on your `veggie_cart` database
   - You should see all tables populated with data
   - Count should match your local database

2. **Test the API**
   ```bash
   # Check products
   curl https://your-repl-name--22204.replit.co/api/products

   # Check users (if you migrated users)
   curl https://your-repl-name--22204.replit.co/api/auth/me
   ```

---

## Tables Migrated

The migration script will transfer data from these tables:

- ✅ `users` - User accounts (passwords are partially redacted)
- ✅ `products` - Product inventory
- ✅ `orders` - Customer orders
- ✅ `order_items` - Order line items
- ✅ `categories` - Product categories
- ✅ `promo_codes` - Discount promo codes
- ✅ `vouchers` - Discount vouchers for users
- ✅ `delivery_settings` - Delivery fee configuration
- ✅ `store_settings` - Store information

---

## What Gets Sanitized

The script automatically redacts sensitive data:

1. **User passwords** - First 10 chars + `***`
   ```
   Before: password: "my_secure_password"
   After:  password: "my_secu***"
   ```

2. **Order user IDs** - Hidden
   ```
   Before: userId: 123
   After:  userId: 123
   (shown as: userId: ***)
   ```

3. **Transaction IDs** - Preserved (needed for tracking)

---

## Troubleshooting

### Error: "Could not connect to local database"

**Solution:**
```bash
# Make sure PostgreSQL is running locally
# Windows: Check PostgreSQL service
# Mac: brew services list
# Linux: systemctl status postgresql
```

### Error: "Authentication failed"

**Solution:**
- Check your password in `LOCAL_DATABASE_URL`
- On Windows, you might need to use `127.0.0.1` instead of `localhost`
- Try accessing your local DB with `psql` directly to confirm connection

### Error: "Table does not exist"

**Solution:**
- The tables must exist in both databases
- Run the database setup script on Replit:
  ```bash
  pnpm --filter @workspace/scripts run setup-db
  ```

### Error: "Password contains embedded credentials"

**Solution:**
- Make sure your connection string follows format: `postgresql://user:password@host:port/db`
- No spaces between segments
- Single quotes NOT needed in connection string

### Error: "Connection timeout"

**Solution:**
- Local database might be sleeping - restart it
- Check firewall settings
- Make sure PostgreSQL is accepting remote connections (localhost is fine)

---

## Alternative: Manual pg_dump (if you prefer)

If you're more comfortable with PostgreSQL tools:

### Export from Local Database

```bash
# Using pg_dump (requires PostgreSQL installed locally)
pg_dump -U your_username -d veggie_cart > local-db-backup.sql

# Or using psql
psql -U your_username -d veggie_cart -c "\COPY users TO STDOUT WITH CSV" > users.csv
psql -U your_username -d veggie_cart -c "\COPY products TO STDOUT WITH CSV" > products.csv
```

### Import to Replit Database

1. **In Replit:**
   - Open the Database tab
   - Click on your database
   - Import CSV files (if you exported CSV)
   - Or run SQL commands directly

2. **Via Terminal:**
   ```bash
   psql $DATABASE_URL < local-db-backup.sql
   ```

---

## After Migration

✅ **Your data is now on Replit!**

### What to do next:

1. **Backup your local database** (optional - for development)
   ```bash
   pg_dump -U your_username -d veggie_cart > backup-$(date +%Y%m%d).sql
   ```

2. **Keep local database for development** - You can switch between local and Replit

3. **Update your .env for local development**:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/veggie_cart
   JWT_SECRET=your_local_secret
   ```

4. **Keep Replit for production**:
   ```
   DATABASE_URL=postgresql://repl_admin:password@localhost:5432/veggie_cart
   JWT_SECRET=your_replit_secret
   ```

---

## Optional: Keep Both Databases

You can maintain both databases:

- **Local:** Development, testing, new features
- **Replit:** Production, demo, customer orders

Just update your `.env` to switch databases:

```bash
# For development
DATABASE_URL=postgresql://user:password@localhost:5432/veggie_cart

# For Replit/production
DATABASE_URL=postgresql://repl_admin:password@localhost:5432/veggie_cart
```

---

## Verify with Seed Script

After migration, you can seed additional data (if needed):

```bash
pnpm --filter @workspace/scripts run seed
```

This will add:
- Sample products
- Sample orders
- Sample promo codes
- Sample vouchers

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `pnpm --filter @workspace/scripts run setup-db` | Create tables on Replit |
| `pnpm --filter @workspace/scripts run migrate-data` | Migrate data to Replit |
| `pnpm --filter @workspace/scripts run seed` | Seed additional data |
| `git pull origin main` | Get latest migration script |

---

## Security Notes

⚠️ **NEVER commit your database passwords to GitHub!**

- ✅ The `.env` file is in `.gitignore`
- ✅ The migration script will redact passwords in the output
- ✅ Only set `LOCAL_DATABASE_URL` temporarily for migration

## Need Help?

If you encounter issues:
1. Check the error message carefully
2. Verify connection strings are correct
3. Make sure both databases are accessible
4. Check PostgreSQL logs on both sides

---

**Success!** 🎉 Your local data is now live on Replit and your customers can see it!