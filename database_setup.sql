-- TradeSphere Multi-Tenant Database Schema
-- Generated for Railway Production Deployment

DROP TABLE IF EXISTS `admins`;
CREATE TABLE `admins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` varchar(50) DEFAULT 'admin',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `phone` varchar(20) DEFAULT NULL,
  `bio` text,
  `location` varchar(255) DEFAULT NULL,
  `trading_style` varchar(100) DEFAULT NULL,
  `avatar_url` varchar(555) DEFAULT NULL,
  `preferences` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `capital_summary`;
CREATE TABLE `capital_summary` (
  `total_capital` decimal(15,2) DEFAULT '0.00',
  `total_pnl` decimal(15,2) DEFAULT '0.00',
  `deployed_capital` decimal(15,2) DEFAULT '0.00',
  `admin_id` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`admin_id`),
  CONSTRAINT `fk_capital_admin` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_capital_summary_admin_id` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `clients`;
CREATE TABLE `clients` (
  `client_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `broker` varchar(255) DEFAULT NULL,
  `capital_invested` decimal(15,2) DEFAULT '0.00',
  `join_date` date DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE','PENDING') DEFAULT 'ACTIVE',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `admin_id` int DEFAULT '1',
  PRIMARY KEY (`client_id`),
  KEY `fk_clients_admin` (`admin_id`),
  CONSTRAINT `fk_clients_admin` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_clients_admin_id` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `reference_notes`;
CREATE TABLE `reference_notes` (
  `note_id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `content` text,
  `file_name` varchar(255) DEFAULT NULL,
  `original_file_name` varchar(255) DEFAULT NULL,
  `file_type` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `admin_id` int DEFAULT '1',
  PRIMARY KEY (`note_id`),
  KEY `fk_notes_admin` (`admin_id`),
  CONSTRAINT `fk_notes_admin` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reference_notes_admin_id` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `trade_clients`;
CREATE TABLE `trade_clients` (
  `trade_id` int NOT NULL,
  `client_id` int NOT NULL,
  PRIMARY KEY (`trade_id`,`client_id`),
  KEY `client_id` (`client_id`),
  CONSTRAINT `trade_clients_ibfk_1` FOREIGN KEY (`trade_id`) REFERENCES `trades` (`trade_id`) ON DELETE CASCADE,
  CONSTRAINT `trade_clients_ibfk_2` FOREIGN KEY (`client_id`) REFERENCES `clients` (`client_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `trade_notes`;
CREATE TABLE `trade_notes` (
  `note_id` int NOT NULL AUTO_INCREMENT,
  `trade_id` int NOT NULL,
  `note_text` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`note_id`),
  KEY `trade_id` (`trade_id`),
  CONSTRAINT `trade_notes_ibfk_1` FOREIGN KEY (`trade_id`) REFERENCES `trades` (`trade_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `trades`;
CREATE TABLE `trades` (
  `trade_id` int NOT NULL AUTO_INCREMENT,
  `stock_name` varchar(255) NOT NULL,
  `trade_type` varchar(50) NOT NULL,
  `mode` varchar(50) NOT NULL,
  `leverage` decimal(5,2) DEFAULT '1.00',
  `entry_price` decimal(15,2) NOT NULL,
  `quantity` int NOT NULL,
  `target` decimal(15,2) DEFAULT NULL,
  `stop_loss` decimal(15,2) DEFAULT NULL,
  `strategy` varchar(255) DEFAULT NULL,
  `conviction_level` varchar(50) DEFAULT NULL,
  `entry_nifty_mood` varchar(255) DEFAULT NULL,
  `entry_notes` text,
  `trade_date` date DEFAULT NULL,
  `status` enum('OPEN','CLOSED') DEFAULT 'OPEN',
  `exit_price` decimal(15,2) DEFAULT NULL,
  `exit_nifty_mood` varchar(255) DEFAULT NULL,
  `exit_reason` varchar(255) DEFAULT NULL,
  `exit_emotion` varchar(255) DEFAULT NULL,
  `conclusion` text,
  `total_pnl` decimal(15,2) DEFAULT NULL,
  `exit_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `closed_at` timestamp NULL DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `admin_id` int DEFAULT '1',
  PRIMARY KEY (`trade_id`),
  KEY `fk_trades_admin` (`admin_id`),
  CONSTRAINT `fk_trades_admin` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_trades_admin_id` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `watchlist_categories`;
CREATE TABLE `watchlist_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `admin_id` int DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_category_per_admin` (`name`,`admin_id`),
  KEY `fk_watchlistcat_admin` (`admin_id`),
  CONSTRAINT `fk_watchlist_categories_admin_id` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_watchlistcat_admin` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `watchlist_symbols`;
CREATE TABLE `watchlist_symbols` (
  `id` int NOT NULL AUTO_INCREMENT,
  `symbol` varchar(255) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `category` varchar(50) DEFAULT 'Short',
  `admin_id` int DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_symbol_per_admin` (`symbol`,`admin_id`),
  KEY `fk_watchlistsym_admin` (`admin_id`),
  CONSTRAINT `fk_watchlist_symbols_admin_id` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_watchlistsym_admin` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

