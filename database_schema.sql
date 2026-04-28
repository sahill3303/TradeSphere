CREATE DATABASE IF NOT EXISTS tradesphere;
USE tradesphere;

-- --------------------------------------------------------
-- Table structure for table `admins`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admins` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) DEFAULT 'admin',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- Table structure for table `clients`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `clients` (
  `client_id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `broker` VARCHAR(255) DEFAULT NULL,
  `capital_invested` DECIMAL(15,2) DEFAULT 0.00,
  `join_date` DATE DEFAULT NULL,
  `status` ENUM('ACTIVE', 'INACTIVE', 'PENDING') DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` BOOLEAN DEFAULT FALSE,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL
);

-- --------------------------------------------------------
-- Table structure for table `trades`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `trades` (
  `trade_id` INT AUTO_INCREMENT PRIMARY KEY,
  `stock_name` VARCHAR(255) NOT NULL,
  `trade_type` VARCHAR(50) NOT NULL,    -- e.g., 'LONG', 'SHORT'
  `mode` VARCHAR(50) NOT NULL,          -- e.g., 'INTRADAY', 'SWING'
  `leverage` DECIMAL(5,2) DEFAULT 1.00,
  `entry_price` DECIMAL(15,2) NOT NULL,
  `quantity` INT NOT NULL,
  `target` DECIMAL(15,2) DEFAULT NULL,
  `stop_loss` DECIMAL(15,2) DEFAULT NULL,
  `strategy` VARCHAR(255) DEFAULT NULL,
  `conviction_level` VARCHAR(50) DEFAULT NULL,
  `entry_nifty_mood` VARCHAR(255) DEFAULT NULL,
  `entry_notes` TEXT DEFAULT NULL,
  `trade_date` DATE DEFAULT NULL,
  `status` ENUM('OPEN', 'CLOSED') DEFAULT 'OPEN',
  `exit_price` DECIMAL(15,2) DEFAULT NULL,
  `exit_nifty_mood` VARCHAR(255) DEFAULT NULL,
  `exit_reason` VARCHAR(255) DEFAULT NULL,
  `exit_emotion` VARCHAR(255) DEFAULT NULL,
  `conclusion` TEXT DEFAULT NULL,
  `total_pnl` DECIMAL(15,2) DEFAULT NULL,
  `exit_date` DATE DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `closed_at` TIMESTAMP NULL DEFAULT NULL,
  `is_deleted` BOOLEAN DEFAULT FALSE,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL
);

-- --------------------------------------------------------
-- Table structure for table `trade_clients`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `trade_clients` (
  `trade_id` INT NOT NULL,
  `client_id` INT NOT NULL,
  PRIMARY KEY (`trade_id`, `client_id`),
  FOREIGN KEY (`trade_id`) REFERENCES `trades`(`trade_id`) ON DELETE CASCADE,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`client_id`) ON DELETE CASCADE
);

-- --------------------------------------------------------
-- Table structure for table `trade_notes`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `trade_notes` (
  `note_id` INT AUTO_INCREMENT PRIMARY KEY,
  `trade_id` INT NOT NULL,
  `note_text` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`trade_id`) REFERENCES `trades`(`trade_id`) ON DELETE CASCADE
);

-- --------------------------------------------------------
-- Table structure for table `capital_summary`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `capital_summary` (
  `capital_id` INT PRIMARY KEY,
  `total_capital` DECIMAL(15,2) DEFAULT 0.00,
  `total_pnl` DECIMAL(15,2) DEFAULT 0.00,
  `deployed_capital` DECIMAL(15,2) DEFAULT 0.00
);

-- Seed initial row for capital_summary
INSERT IGNORE INTO `capital_summary` (`capital_id`, `total_capital`, `total_pnl`, `deployed_capital`) 
VALUES (1, 0.00, 0.00, 0.00);

-- --------------------------------------------------------
-- Table structure for table `reference_notes`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `reference_notes` (
  `note_id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT,
  `file_name` VARCHAR(255) DEFAULT NULL,
  `original_file_name` VARCHAR(255) DEFAULT NULL,
  `file_type` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- Table structure for table `watchlist_symbols`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `watchlist_symbols` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `symbol` VARCHAR(255) NOT NULL UNIQUE,
  `name` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
