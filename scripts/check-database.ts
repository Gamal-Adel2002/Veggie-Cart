import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(process.cwd(), '..', '.env') });

async function checkDatabase() {
  const connectionString = process.env.DATABASE_URL || process.env.REPLIT_DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in .env file');
    console.log('\n💡 Set DATABASE_URL in your .env file or Replit environment variables');
    console.log('   Format: postgresql://user:password@host:port/database\n');
    process.exit(1);
  }

  console.log('🔍 Checking Replit Database');
  console.log('📍 Connection:', connectionString.replace(/:[^:@]+@/, ':**@')); // Hide password
  console.log('\n');

  const sql = postgres(connectionString);

  try {
    // Test connection
    await sql`SELECT 1`;
    console.log('✅ Connected to database\n');

    // Get all tables
    const tablesResult = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    console.log('📊 Tables in Database:');
    if (tablesResult.length === 0) {
      console.log('   ⚠️  No tables found');
      console.log('\n💡 Run setup: pnpm --filter @workspace/scripts run setup-db\n');
    } else {
      tablesResult.forEach((row: any) => {
        console.log(`   ✅ ${row.table_name}`);
      });
      console.log('');

      // Get row counts
      for (const table of tablesResult) {
        try {
          const countResult = await sql`SELECT COUNT(*) as count FROM ${sql.raw(table.table_name)}`;
          console.log(`   └─ ${table.table_name}: ${countResult[0].count} rows`);
        } catch (error) {
          console.log(`   └─ ${table.table_name}: (error checking count)`);
        }
      }
      console.log('');

      // Show a sample from each table
      for (const table of tablesResult.slice(0, 3)) { // Show first 3 tables
        try {
          const sample = await sql`
            SELECT *
            FROM ${sql.raw(table.table_name)}
            LIMIT 3
          `;
          console.log(`📝 Sample from ${table.table_name}:`);
          console.log(`   Columns: ${sample.columns.join(', ')}`);
          if (sample.length > 0) {
            const keys = Object.keys(sample[0]);
            const values = keys.map((key) => {
              const val = sample[0][key];
              return typeof val === 'string' && val.length > 20 ? val.substring(0, 20) + '...' : val;
            }).join(', ');
            console.log(`   Data: ${values}`);
          }
          console.log('');
        } catch (error) {
          console.log(`   ⚠️  Could not fetch sample from ${table.table_name}\n`);
        }
      }
    }

    console.log('✅ Database check complete!');

  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message);
    console.error('\n💡 Make sure:');
    console.error('   1. DATABASE_URL is set in .env or Replit environment');
    console.error('   2. Database is created in Replit Database tab');
    console.error('   3. Connection string is correct');
    throw error;
  } finally {
    await sql.end();
  }
}

checkDatabase().catch(console.error);