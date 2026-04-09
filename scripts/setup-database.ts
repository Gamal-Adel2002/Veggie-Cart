import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { sql } from '@workspace/db';
import fs from 'fs';

// Load environment variables from .env file
dotenv.config({ path: path.join(process.cwd(), '..', '.env') });

async function setupDatabase() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://repl_admin:your_password_here@localhost:5432/veggie_cart';

  console.log('🚀 Connecting to PostgreSQL...');
  const sql = postgres(connectionString);

  try {
    // Test connection
    await sql`SELECT 1`;
    console.log('✅ Connected to database successfully!');

    // Check if we need to run Drizzle migrations
    const migrationFiles = fs.readdirSync(path.join(process.cwd(), '..', 'migrations'));
    console.log(`📝 Found ${migrationFiles.length} migration files`);

    if (migrationFiles.length > 0) {
      console.log('🔄 Applying migrations...');
      const { migrate } = await import('drizzle-orm/postgres-js/migrator');
      const { drizzle } = await import('drizzle-orm/postgres-js');

      await migrate(drizzle(sql), {
        migrationsFolder: path.join(process.cwd(), '..', 'migrations'),
      });
      console.log('✅ Migrations completed successfully!');
    }

    // List all tables
    const tablesResult = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `;

    console.log('\n📊 Database Tables:');
    if (tablesResult.length === 0) {
      console.log('   ⚠️  No tables found. Drizzle will auto-create them on first startup.');
      console.log('   💡 Make sure the database URL is set correctly in .env');
    } else {
      tablesResult.forEach((row: any) => {
        console.log(`   ✅ ${row.table_name}`);
      });
    }

    console.log('\n✅ Database setup complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Make sure DATABASE_URL and JWT_SECRET are set in Repl environment variables');
    console.log('   2. Restart the Repl to apply environment changes');
    console.log('   3. The app will auto-create tables on first startup');
    console.log('   4. Seed data with: pnpm --filter @workspace/scripts run seed');

  } catch (error: any) {
    console.error('❌ Database setup failed:', error.message);

    if (error.message.includes('Authentication failed')) {
      console.log('\n💡 Try resetting your database password in Replit:');
      console.log('   1. Go to Database tab in Replit');
      console.log('   2. Click on your database');
      console.log('   3. Click "Reset password"');
      console.log('   4. Update DATABASE_URL with new password');
    } else if (error.message.includes('does not exist')) {
      console.log('\n💡 Create a new database in Replit:');
      console.log('   1. Go to Database tab in Replit');
      console.log('   2. Click "Create Database"');
      console.log('   3. Name it "veggie_cart"');
      console.log('   4. Update DATABASE_URL with the new connection string');
    }

    throw error;
  } finally {
    await sql.end();
  }
}

setupDatabase().catch(console.error);
