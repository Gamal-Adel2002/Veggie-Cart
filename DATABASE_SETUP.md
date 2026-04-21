# Database Setup Guide for Replit

## Problem: Database Not Found on Replit

If you're seeing database connection errors on Replit, follow these steps to set it up correctly.

## Step 1: Create PostgreSQL Database in Replit

1. **Open your Replit project**
   - Go to https://replit.com and open your Veggie-Cart project

2. **Navigate to Database tab**
   - Look for the "Database" icon (next to Files, Shell, etc.)
   - Click on it

3. **Create new database**
   - Click "Create Database"
   - Select "PostgreSQL"
   - Give it a name (e.g., "veggie_cart" or "freshveggies")
   - Click "Create"

4. **Copy connection string**
   - Once created, click on the database
   - Copy the connection string (it looks like: `postgresql://user:password@localhost:5432/dbname`)

## Step 2: Set Environment Variables

1. **Go to Repl Settings**
   - Click the gear icon (Settings) in the left sidebar
   - Select "Environment" tab

2. **Set these variables:**

   | Variable | Value | Description |
   |----------|-------|-------------|
   | `DATABASE_URL` | Copy from Step 1 | PostgreSQL connection string |
   | `JWT_SECRET` | `generate_secure_random_string` | Use: `openssl rand -base64 32` |

   Example values:
   ```
   DATABASE_URL=postgresql://repl_admin:your_secure_password@localhost:5432/veggie_cart
   JWT_SECRET=KX9fP2mN8qL4rT7vW0yZ2b5c8E1gH4j
   ```

3. **Save the changes** - Replit will ask to restart

## Step 3: Run Database Setup

1. **Open Terminal**
   - Click the Terminal icon
   - Run the setup script:
     ```bash
     pnpm --filter @workspace/scripts run setup-db
     ```

   Or manually:
     ```bash
     npx tsx scripts/setup-database.ts
     ```

2. **Wait for migrations to complete**
   - You should see: `✅ Database setup complete!`
   - All tables should be created

## Step 4: Verify Database is Connected

1. **Check the terminal output**
   - Look for: `✅ Connected to database successfully!`
   - Look for tables being created

2. **Test the API**
   - Visit: `https://your-repl-name--22204.replit.co/api/health`
   - Should return: `{"status":"healthy"}`

3. **Check database in Replit**
   - Go back to Database tab
   - You should see all the tables: `users`, `products`, `orders`, `categories`, etc.

## Troubleshooting

### Error: "Connection refused" or "could not connect to server"

**Solution:**
- Make sure you copied the connection string correctly
- The DATABASE_URL should contain `localhost:5432`
- Verify the database is created in the Database tab

### Error: "password authentication failed"

**Solution:**
- Click on your database in the Database tab
- Reset the password if needed
- Update the DATABASE_URL with the new password

### Error: "database does not exist"

**Solution:**
- Create a new database in the Database tab
- Give it a unique name (e.g., `freshveggies_v2`)
- Update the DATABASE_URL with the new database name

### Tables not created

**Solution:**
- Run the setup script again: `pnpm --filter @workspace/scripts run setup-db`
- Check for any migration files in the `migrations/` directory
- Verify the schema files are correct

## Alternative: Manual Database Setup

If you prefer to create the database yourself:

1. **Generate SQL migration file** (already exists in `migrations/`)
2. **Run migrations manually** (Drizzle auto-runs on first start)
3. **Seed the database** with sample data:
   ```bash
   pnpm --filter @workspace/scripts run seed
   ```

## Database Tables

After successful setup, you should have these tables:

- `users` - User accounts
- `products` - Product inventory
- `orders` - Orders with order items
- `categories` - Product categories
- `order_items` - Line items in orders
- `promo_codes` - Discount promo codes
- `vouchers` - Discount vouchers for users
- `delivery_settings` - Delivery fee configuration
- `store_settings` - Store information and hours

## Connection String Format

A typical PostgreSQL connection string looks like:

```
postgresql://username:password@hostname:port/database
```

For Replit, it's typically:

```
postgresql://repl_admin:YOUR_PASSWORD@localhost:5432/veggie_cart
```

## Testing the Connection

Run this command in Replit terminal:

```bash
# Test database connection
node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => {
    console.log('✅ Database connected');
    return client.query('SELECT version()');
  })
  .then(res => console.log('Database version:', res.rows[0].version))
  .catch(err => console.error('Connection failed:', err))
  .finally(() => client.end());
"
```

## Need Help?

If you're still having issues:

1. Check the Replit deployment logs
2. Look for database connection errors in the terminal
3. Verify all environment variables are set correctly
4. Ensure the database is created in the Database tab

## Quick Setup Checklist

- [ ] PostgreSQL database created in Replit
- [ ] DATABASE_URL copied and set in environment variables
- [ ] JWT_SECRET set in environment variables
- [ ] Repl restarted after changing environment variables
- [ ] Setup script run successfully
- [ ] Tables created (visible in Database tab)
- [ ] Health check endpoint returns healthy status