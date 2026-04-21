import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '..', '.env') });

interface DatabaseInfo {
  name: string;
  url: string;
  type: string;
  tables?: number;
  rows?: number;
}

async function findDatabases() {
  console.log('🔍 Searching for all databases used by your project...\n');

  const databases: DatabaseInfo[] = [];

  // 1. Check DATABASE_URL from .env
  if (process.env.DATABASE_URL) {
    databases.push({
      name: 'Local .env DATABASE_URL',
      url: process.env.DATABASE_URL,
      type: 'PostgreSQL',
    });
  }

  // 2. Check REPLIT_DATABASE_URL
  if (process.env.REPLIT_DATABASE_URL) {
    databases.push({
      name: 'Replit DATABASE_URL',
      url: process.env.REPLIT_DATABASE_URL,
      type: 'PostgreSQL',
    });
  }

  // 3. Check LOCAL_DATABASE_URL
  if (process.env.LOCAL_DATABASE_URL) {
    databases.push({
      name: 'LOCAL_DATABASE_URL',
      url: process.env.LOCAL_DATABASE_URL,
      type: 'PostgreSQL',
    });
  }

  // 4. Check any .env files in other locations
  const envFiles = [
    path.join(process.cwd(), '..', '.env'),
    path.join(process.cwd(), '..', '.env.local'),
    path.join(process.cwd(), '..', '.env.development'),
    path.join(process.cwd(), '..', '.env.production'),
  ];

  for (const envFile of envFiles) {
    if (path.existsSync(envFile)) {
      const localEnv = dotenv.config({ path: envFile }).parsed;
      if (localEnv?.DATABASE_URL && !databases.some(d => d.url.includes(envFile))) {
        databases.push({
          name: `${envFile.replace(path.join(process.cwd(), '..', ''), '')}`,
          url: localEnv.DATABASE_URL,
          type: 'PostgreSQL',
        });
      }
    }
  }

  // Display findings
  if (databases.length === 0) {
    console.log('❌ No database URLs found in environment variables');
    console.log('\n💡 Check these places:');
    console.log('   1. .env file in project root');
    console.log('   2. Replit Environment Settings');
    console.log('   3. Replit .env file');
    console.log('\nFormat: DATABASE_URL=postgresql://user:password@host:port/database\n');
    return;
  }

  console.log('📊 Found Databases:\n');

  databases.forEach((db, idx) => {
    const maskedUrl = db.url.replace(/:[^:@]+@/, ':**@'); // Hide password
    console.log(`${idx + 1}. ${db.name}`);
    console.log(`   Type: ${db.type}`);
    console.log(`   Connection: ${maskedUrl}`);
    console.log('');
  });

  // Try to connect and get details
  console.log('🔄 Connecting to databases...\n');

  const postgres = require('postgres');

  for (const db of databases) {
    try {
      const sql = postgres(db.url);

      // Test connection
      await sql`SELECT 1`;

      // Get tables
      const tablesResult = await sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `;

      // Get row counts
      const rowCounts: number[] = [];
      for (const table of tablesResult) {
        const countResult = await sql`
          SELECT COUNT(*) as count FROM ${sql.raw(table.table_name)}
        `;
        rowCounts.push(countResult[0].count);
      }

      db.tables = tablesResult.length;
      db.rows = rowCounts.reduce((a, b) => a + b, 0);

      await sql.end();
    } catch (error: any) {
      console.log(`❌ ${db.name}: ${error.message}`);
    }
  }

  // Display results
  console.log('✅ Database Summary:\n');

  databases.forEach((db, idx) => {
    console.log(`${idx + 1}. ${db.name}`);
    if (db.tables !== undefined) {
      console.log(`   Tables: ${db.tables}`);
      console.log(`   Total Rows: ${db.rows}`);
    }
    console.log('');
  });

  // Show sample data from the main database
  const mainDb = databases.find(d => d.name.includes('.env DATABASE_URL') || d.name.includes('DATABASE_URL'));
  if (mainDb && mainDb.tables && mainDb.tables > 0) {
    console.log('📝 Sample Data from Main Database:\n');

    try {
      const sql = postgres(mainDb.url);

      const tablesResult = await sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        LIMIT 3
      `;

      for (const table of tablesResult) {
        try {
          const sample = await sql`
            SELECT *
            FROM ${sql.raw(table.table_name)}
            LIMIT 2
          `;

          if (sample.length > 0) {
            console.log(`   📂 ${table.table_name}:`);
            console.log(`      Columns: ${sample.columns.join(', ')}`);
            const firstRow = sample[0];
            const keys = Object.keys(firstRow);
            const sampleValues = keys.slice(0, 5).map(key => {
              const val = firstRow[key];
              return typeof val === 'string' ? `'${val.substring(0, 20)}...'` : String(val);
            }).join(', ');
            console.log(`      Sample: { ${sampleValues} }`);
            console.log('');
          }
        } catch (error) {
          console.log(`   ⚠️  Could not fetch sample from ${table.table_name}\n`);
        }
      }

      await sql.end();
    } catch (error: any) {
      console.log('❌ Could not fetch sample data:', error.message, '\n');
    }
  }

  console.log('🎯 Recommendations:\n');

  if (databases.length === 1) {
    console.log('   ✅ You have one database configured');
    console.log('   1. This is likely your main development database');
    console.log('   2. To see the data, run: pnpm --filter @workspace/scripts run check-db\n');
  } else {
    console.log('   ℹ️  You have multiple databases configured');
    console.log('   1. Use check-db to see details of each database');
    console.log('   2. Use migrate-data to copy data between databases\n');
  }
}

findDatabases().catch(console.error);