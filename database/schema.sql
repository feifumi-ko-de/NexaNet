CREATE DATABASE IF NOT EXISTS nexanet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nexanet;

DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS computers;
DROP TABLE IF EXISTS rates;
DROP TABLE IF EXISTS admins;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  username VARCHAR(30) NOT NULL UNIQUE,
  email VARCHAR(120) NOT NULL UNIQUE,
  phone VARCHAR(30) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  hourly_price DECIMAL(12,2) NOT NULL,
  description VARCHAR(255),
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE computers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  rate_id INT NOT NULL,
  status ENUM('AVAILABLE','MAINTENANCE','INACTIVE') NOT NULL DEFAULT 'AVAILABLE',
  specs VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_computer_rate FOREIGN KEY (rate_id) REFERENCES rates(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_code VARCHAR(30) NOT NULL UNIQUE,
  user_id INT NULL,
  customer_name VARCHAR(100) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(120),
  computer_id INT NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_hours INT NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  payment_method ENUM('CASH') NOT NULL DEFAULT 'CASH',
  payment_status ENUM('UNPAID','PAID') NOT NULL DEFAULT 'UNPAID',
  status ENUM('PENDING','CONFIRMED','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  notes VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_reservation_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_reservation_computer FOREIGN KEY (computer_id) REFERENCES computers(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_reservation_schedule (computer_id, booking_date, start_time, end_time),
  INDEX idx_reservation_customer (booking_code, phone)
);

-- DEMO DATA. Ubah sesuai data usaha nyata sebelum presentasi/pengumpulan. Login demo: admin / admin123
INSERT INTO admins (username, password_hash, name) VALUES
('admin', 'scrypt$a0f9a84457fb602d82446dbc80751993$2aa55f70b09e485c2e0ea3693a198b3153a5e73daddc2a57691bab03f2b70e90674317980354111222cf84a9b7450335da53f055643717bcea91bc0bfcf048c9', 'Administrator');

-- Demo customer login: user / user12345
INSERT INTO users (full_name, username, email, phone, password_hash) VALUES
('Demo User', 'user', 'user@nexanet.local', '081234567890', 'scrypt$nexanet-demo-user-2026$454f68c1c12b4aeeb39d5dafe740ca211d5ff26679cc2d1997a73277d56b39052a1380eb27629debdb27a3b427013252132377315b409fbba1b68775679a0743');

INSERT INTO rates (name, hourly_price, description, active) VALUES
('Regular', 7000, 'PC standar untuk browsing dan gaming ringan.', 1),
('Gaming', 10000, 'PC gaming dengan spesifikasi lebih tinggi.', 1),
('Premium', 15000, 'PC premium untuk game berat dan editing.', 1);

INSERT INTO computers (code, name, rate_id, status, specs) VALUES
('PC-01', 'Nexa PC 01', 1, 'AVAILABLE', 'Core i3 / 8 GB RAM / GTX 1050'),
('PC-02', 'Nexa PC 02', 1, 'AVAILABLE', 'Core i3 / 8 GB RAM / GTX 1050'),
('PC-03', 'Nexa Gaming 01', 2, 'AVAILABLE', 'Core i5 / 16 GB RAM / RTX 2060'),
('PC-04', 'Nexa Gaming 02', 2, 'AVAILABLE', 'Core i5 / 16 GB RAM / RTX 2060'),
('PC-05', 'Nexa Premium 01', 3, 'MAINTENANCE', 'Core i7 / 32 GB RAM / RTX 3060');
