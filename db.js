'use strict';
require('dotenv').config();
const sql = require('mssql');

// =========================
// BASE SQL SERVER CONFIG
// =========================
const BASE_CONFIG = {
  user:     process.env.DB_USER     || 'sa',
  password: process.env.DB_PASSWORD || 'ass.2013',
  server:   process.env.DB_SERVER   || '121.0.0.180',
  port:     parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  connectionTimeout: 15000,
  requestTimeout:    30000,
};

// =========================
// DATABASE TARGETS
// =========================
const DATABASES = {
  dblist: 'dblist',
};

// =========================
// POOL CACHE
// =========================
const _pools = {};

async function getPool(dbKey = 'dblist') {
  if (!DATABASES[dbKey]) {
    throw new Error(`❌ Unknown DB Key: ${dbKey}`);
  }

  if (_pools[dbKey] && _pools[dbKey].connected) {
    return _pools[dbKey];
  }

  const config = { ...BASE_CONFIG, database: DATABASES[dbKey] };
  const pool   = new sql.ConnectionPool(config);

  pool.on('error', (err) => {
    console.error(`[DB ERROR]:`, err.message);
    delete _pools[dbKey];
  });

  await pool.connect();
  console.log(`✅ Connected → ${DATABASES[dbKey]}`);
  _pools[dbKey] = pool;
  return pool;
}

// =========================
// TEST CONNECTION
// =========================
async function testConnection() {
  try {
    const pool   = await getPool('dblist');
    const result = await pool.request().query(`
      SELECT DB_NAME() as dbName, GETDATE() as serverTime
    `);
    console.log('✅ CONNECTION SUCCESS');
    console.log(result.recordset[0]);
  } catch (err) {
    console.error('❌ CONNECTION FAILED:', err.message);
  }
}

// =========================
// TEST QUERY (dbo.koneksi)
// =========================
async function testQuery() {
  try {
    const pool   = await getPool('dblist');
    const result = await pool.request().query(`
      SELECT company, catalog FROM dbo.koneksi
    `);
    console.log('📊 DATA COMPANY (dbo.koneksi):');
    console.table(result.recordset);
  } catch (err) {
    console.error('❌ QUERY FAILED:', err.message);
  }
}

// =========================
// AUTO RUN TEST (only when called directly)
// =========================
if (require.main === module) {
  (async () => {
    console.log('🔍 TESTING DATABASE...');
    await testConnection();
    await testQuery();
    process.exit(0); // fixed: removed stray 's' before this line
  })();
}

module.exports = { sql, getPool };
