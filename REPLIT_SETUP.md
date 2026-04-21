# Replit Deployment Guide

## Overview
This guide will help you deploy the Veggie-Cart application to Replit from GitHub.

## Current Setup
- GitHub Repository: https://github.com/Gamal-Adel2002/Veggie-Cart
- API Server: Node.js 24 with PostgreSQL 16
- Grocery Store: Node.js 24 with Vite

## Prerequisites
1. Replit account
2. Access to the Veggie-Cart GitHub repository

## Deployment Steps

### Option 1: Replit Web Interface

1. **Create New Replit**
   - Go to https://replit.com
   - Click "Create Repl" → "Templates"
   - Select "Full stack Node.js" template

2. **Connect to GitHub**
   - In the Replit editor, click "Add File"
   - Select "Clone from Git"
   - Enter: `https://github.com/Gamal-Adel2002/Veggie-Cart.git`
   - Wait for cloning to complete

3. **Configure Database**
   - Click "Database" tab
   - Select "PostgreSQL" → "Create"
   - Copy the connection string

4. **Set Environment Variables**
   - Go to Repl Settings → Environment
   - Add the following variables:

   **API Server (.replit in artifacts/api-server):**
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/veggie_cart
   JWT_SECRET=your_secure_random_secret_key_here
   PORT=8080
   PAYMOB_API_KEY= (empty - PayMob is disabled)
   PAYMOB_MERCHANT_ID= (empty - PayMob is disabled)
   PAYMOB_TERMINAL_ID= (empty - PayMob is disabled)
   PAYMOB_WEBHOOK_SECRET= (empty - PayMob is disabled)
   ```

5. **Build and Run**
   - Click "Deploy" button
   - The Replit workflow will automatically:
     1. Install dependencies (`pnpm install`)
     2. Build the API server (`pnpm run build`)
     3. Start the servers in parallel

6. **Test Deployment**
   - After deployment completes, click "Open"
   - Check the console output to verify both servers started
   - API should be accessible at: `https://your-repl-name--22204.replit.co`
   - The frontend should automatically proxy to port 22204

### Option 2: Use Replit Workspaces (Multi-container)

The repository includes `.replit` files configured for multi-container workspaces:

1. **Navigate to the workspace** and select "Project" workflow
2. **Run the workflow** - This will start both the API server and storefront in parallel
3. **Access the application** at the deployment URL

## Manual Deployment Commands

If you need to run the application manually:

```bash
# Install dependencies
pnpm install

# Run API server
PORT=8080 pnpm --filter @workspace/api-server run dev

# Run frontend in another terminal
PORT=22204 pnpm --filter @workspace/grocery-store run dev
```

## Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `JWT_SECRET` | Secret for JWT token signing | Yes | - |
| `PORT` | API server port | No | 8080 |
| `PAYMOB_API_KEY` | PayMob API key | No | Empty |
| `PAYMOB_MERCHANT_ID` | PayMob merchant ID | No | Empty |
| `PAYMOB_TERMINAL_ID` | PayMob terminal ID | No | Empty |
| `PAYMOB_WEBHOOK_SECRET` | PayMob webhook secret | No | Empty |

## Database Setup

The application uses PostgreSQL with Drizzle ORM. After connecting to Replit:

1. Database schema will be auto-created on first run
2. You may need to run migrations if any are added
3. For production, consider:
   - Using Replit's managed PostgreSQL
   - Setting up a separate production database
   - Configuring backups

## Environment-Specific Configurations

The `.replit` files include:
- Node.js 24 runtime
- PostgreSQL 16 database support
- Auto-scaling deployment targets
- Pre-build and post-build scripts
- Port configurations (8080 for API, 22204 for storefront)

## PayMob Status

**PayMob is currently DISABLED.** All payments are cash on delivery.

The payment gateway has been removed from the codebase:
- PayMob routes are commented out in `artifacts/api-server/src/routes/index.ts`
- Order creation forces payment method to "cash"
- All PayMob UI references have been removed from frontend

## Troubleshooting

### Build Fails
- Check that Node.js 24 is selected in Replit
- Verify all dependencies are installed correctly
- Check console output for specific error messages

### Database Connection Issues
- Verify `DATABASE_URL` is set correctly
- Check if PostgreSQL is running on Replit
- Ensure the database is created

### Port Already in Use
- Replit automatically handles port configurations
- Check `.replit` files for port settings
- Restart the deployment if needed

### Frontend Not Loading
- Verify the API server is running
- Check that CORS is properly configured
- Review browser console for errors

## Post-Deployment Tasks

1. **Test the application**
   - Create a test account
   - Place a test order
   - Verify all features work

2. **Configure domain (optional)**
   - Go to Repl Settings → Deployment
   - Add custom domain if needed

3. **Set up monitoring**
   - Configure logging
   - Set up alerting
   - Monitor application health

4. **Security hardening**
   - Update `JWT_SECRET` with a strong value
   - Set up firewall rules if needed
   - Review and secure environment variables

## Support

For issues or questions:
- Check the repository README
- Review deployment logs in Replit
- Check GitHub Issues for common problems