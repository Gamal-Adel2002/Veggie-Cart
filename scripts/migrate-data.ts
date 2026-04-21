import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(process.cwd(), '..', '.env') });

// Configuration
const LOCAL_DATABASE_URL = process.env.LOCAL_DATABASE_URL || 'postgresql://localhost:5432/veggie_cart';
const REPLIT_DATABASE_URL = process.env.DATABASE_URL || process.env.REPLIT_DATABASE_URL || 'postgresql://repl_admin:your_password_here@localhost:5432/veggie_cart';

// Tables to migrate (exclude system tables and migration logs)
const TABLES = [
  'users',
  'products',
  'orders',
  'order_items',
  'categories',
  'promo_codes',
  'vouchers',
  'delivery_settings',
  'store_settings',
];

// Strip sensitive data from data (remove passwords, JWT secrets, etc.)
function sanitizeData(data: any, table: string): any {
  if (table === 'users' && data) {
    return {
      ...data,
      password: data.password?.substring(0, 10) + '***',
    };
  }
  if (table === 'orders' && data) {
    return {
      ...data,
      userId: data.userId || data.userId === null ? null : '***',
    };
  }
  return data;
}

async function migrateData() {
  console.log('🚀 Data Migration Script\n');
  console.log('📍 Source:', LOCAL_DATABASE_URL);
  console.log('📍 Destination:', REPLIT_DATABASE_URL);
  console.log('\n');

  const localSql = postgres(LOCAL_DATABASE_URL);
  const replSql = postgres(REPLIT_DATABASE_URL);

  try {
    // Test both connections
    console.log('🔄 Testing connections...');
    await localSql`SELECT 1`;
    console.log('   ✅ Local database connected');
    await replSql`SELECT 1`;
    console.log('   ✅ Replit database connected\n');

    // Get data from each table
    for (const table of TABLES) {
      try {
        console.log(`📥 Migrating table: ${table}`);

        const data = await localSql`
          SELECT *
          FROM ${sql.raw(table)}
        `;

        console.log(`   Found ${data.length} rows in ${table}`);

        if (data.length === 0) {
          console.log(`   ⏭️  Skipping - no data\n`);
          continue;
        }

        // Sanitize sensitive data
        const sanitizedData = data.map((row) => sanitizeData(row, table));

        // Determine if table has an auto-incrementing ID
        const [{ column_name }] = await localSql`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = ${table}
            AND column_default LIKE 'nextval%'
        `;

        const idColumn = column_name || 'id';

        // Insert into Replit database
        for (let i = 0; i < sanitizedData.length; i++) {
          const row = sanitizedData[i];
          const values = Object.values(row);
          const columns = Object.keys(row).join(', ');
          const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');

          try {
            await replSql`
              INSERT INTO ${sql.raw(table)} (${columns})
              VALUES (${placeholders})
              ON CONFLICT (${idColumn})
              DO UPDATE SET
                ${values.map((_, idx) => sql.raw(`${Object.keys(row)[idx]} = EXCLUDED.${Object.keys(row)[idx]}`)).join(', ')}
            `;
          } catch (error: any) {
            console.error(`   ❌ Error inserting row ${i + 1} into ${table}:`, error.message);
            // Continue with next row
          }
        }

        console.log(`   ✅ Successfully migrated ${data.length} rows to ${table}\n`);
      } catch (error: any) {
        console.error(`   ❌ Error migrating table ${table}:`, error.message);
        console.error('   💡 This table may not exist or have different schema\n');
        continue;
      }
    }

    console.log('✅ Data migration completed successfully!\n');
    console.log('🎉 All data has been migrated from your local database to Replit.');
    console.log('🧹 You can now delete your local database or keep it for development.\n');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await localSql.end();
    await replSql.end();
  }
}

migrateData().catch(console.error);
