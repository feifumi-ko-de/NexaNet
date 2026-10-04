require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function getDbName() {
  const name = process.env.DB_NAME || 'nexanet';
  if (!/^[A-Za-z0-9_]+$/.test(name)) {
    throw new Error('DB_NAME hanya boleh berisi huruf, angka, dan underscore.');
  }
  return name;
}

async function initializeDatabase() {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const dbName = getDbName();

  // Connect to MySQL server without selecting a database first.
  const server = await mysql.createConnection({
    host,
    user,
    password,
    multipleStatements: true
  });

  try {
    await server.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );

    const [tables] = await server.query(
      `SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = ?`,
      [dbName]
    );

    // Only import the bundled schema automatically on a brand-new/empty database.
    // This avoids dropping existing user data on normal application restarts.
    if (Number(tables[0].total) === 0) {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await server.query(schema);
      console.log(`Database '${dbName}' berhasil dibuat dan diisi data demo.`);
    } else {
      // Migrate existing NexaNet databases to the account feature without dropping data.
      await server.query(`
        CREATE TABLE IF NOT EXISTS \`${dbName}\`.users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          full_name VARCHAR(100) NOT NULL,
          username VARCHAR(30) NOT NULL UNIQUE,
          email VARCHAR(120) NOT NULL UNIQUE,
          phone VARCHAR(30) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          active TINYINT(1) NOT NULL DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      const [reservationColumns] = await server.query(
        `SELECT COUNT(*) AS total FROM information_schema.columns WHERE table_schema = ? AND table_name = 'reservations' AND column_name = 'user_id'`,
        [dbName]
      );
      if (Number(reservationColumns[0].total) === 0) {
        await server.query(`ALTER TABLE \`${dbName}\`.reservations ADD COLUMN user_id INT NULL AFTER booking_code`);
      }
      const [fkRows] = await server.query(
        `SELECT COUNT(*) AS total FROM information_schema.key_column_usage WHERE table_schema = ? AND table_name = 'reservations' AND column_name = 'user_id' AND referenced_table_name = 'users'`,
        [dbName]
      );
      if (Number(fkRows[0].total) === 0) {
        await server.query(`ALTER TABLE \`${dbName}\`.reservations ADD CONSTRAINT fk_reservation_user FOREIGN KEY (user_id) REFERENCES \`${dbName}\`.users(id) ON UPDATE CASCADE ON DELETE SET NULL`);
      }
      console.log(`Database '${dbName}' sudah tersedia.`);
    }
  } finally {
    await server.end();
  }
}

module.exports = { initializeDatabase };
