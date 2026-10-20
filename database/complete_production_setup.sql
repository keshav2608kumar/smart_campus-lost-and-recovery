-- ========================================================
-- Smart Campus Lost & Found System - Complete Cloud Setup
-- Compatible with MySQL 8.x, TiDB Cloud, Aiven, AWS RDS, etc.
-- ========================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'STUDENT',
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_users_role CHECK (role IN ('STUDENT', 'STAFF', 'ADMIN'))
) ENGINE=InnoDB;

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
) ENGINE=InnoDB;

-- 3. LOCATIONS TABLE
CREATE TABLE IF NOT EXISTS locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    building VARCHAR(100),
    floor VARCHAR(50),
    description TEXT
) ENGINE=InnoDB;

-- 4. LOST ITEMS TABLE
CREATE TABLE IF NOT EXISTS lost_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    location_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    color VARCHAR(50),
    brand VARCHAR(100),
    unique_features TEXT,
    lost_date DATE NOT NULL,
    lost_time TIME,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_lost_status CHECK (status IN ('ACTIVE', 'MATCHED', 'RECOVERED', 'CANCELLED')),
    CONSTRAINT fk_lost_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_lost_cat FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    CONSTRAINT fk_lost_loc FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX idx_lost_category ON lost_items(category_id);
CREATE INDEX idx_lost_location ON lost_items(location_id);
CREATE INDEX idx_lost_date ON lost_items(lost_date);
CREATE INDEX idx_lost_status ON lost_items(status);

-- 5. FOUND ITEMS TABLE
CREATE TABLE IF NOT EXISTS found_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    location_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    color VARCHAR(50),
    brand VARCHAR(100),
    unique_features TEXT,
    found_date DATE NOT NULL,
    found_time TIME,
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_found_status CHECK (status IN ('AVAILABLE', 'CLAIMED', 'RETURNED', 'CANCELLED')),
    CONSTRAINT fk_found_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_found_cat FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    CONSTRAINT fk_found_loc FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX idx_found_category ON found_items(category_id);
CREATE INDEX idx_found_location ON found_items(location_id);
CREATE INDEX idx_found_date ON found_items(found_date);
CREATE INDEX idx_found_status ON found_items(status);

-- 6. MATCHES TABLE
CREATE TABLE IF NOT EXISTS matches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lost_item_id INT NOT NULL,
    found_item_id INT NOT NULL,
    match_score DECIMAL(5,2) NOT NULL,
    matching_details JSON,
    status VARCHAR(30) NOT NULL DEFAULT 'SUGGESTED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_match_status CHECK (status IN ('SUGGESTED', 'UNDER_REVIEW', 'CONFIRMED', 'REJECTED')),
    CONSTRAINT fk_match_lost FOREIGN KEY (lost_item_id) REFERENCES lost_items(id) ON DELETE CASCADE,
    CONSTRAINT fk_match_found FOREIGN KEY (found_item_id) REFERENCES found_items(id) ON DELETE CASCADE,
    CONSTRAINT uq_match_pair UNIQUE (lost_item_id, found_item_id)
) ENGINE=InnoDB;

-- 7. CLAIMS TABLE
CREATE TABLE IF NOT EXISTS claims (
    id INT AUTO_INCREMENT PRIMARY KEY,
    match_id INT NOT NULL,
    claimant_id INT NOT NULL,
    proof_details TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    reviewed_by INT,
    CONSTRAINT chk_claim_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    CONSTRAINT fk_claim_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    CONSTRAINT fk_claim_user FOREIGN KEY (claimant_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_claim_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_claims_status ON claims(status);

-- 8. VERIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    claim_id INT NOT NULL UNIQUE,
    verifier_id INT NOT NULL,
    verification_notes TEXT,
    result VARCHAR(30) NOT NULL,
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_verification_result CHECK (result IN ('VALID', 'INVALID')),
    CONSTRAINT fk_verify_claim FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE,
    CONSTRAINT fk_verify_verifier FOREIGN KEY (verifier_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 9. HANDOVERS TABLE
CREATE TABLE IF NOT EXISTS handovers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    claim_id INT NOT NULL UNIQUE,
    staff_id INT NOT NULL,
    handover_location VARCHAR(150) NOT NULL,
    handover_time TIMESTAMP NOT NULL,
    notes TEXT,
    CONSTRAINT fk_handover_claim FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE,
    CONSTRAINT fk_handover_staff FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 10. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- ========================================================
-- SEED DATA: 5 Students, 1 Staff, 1 Admin
-- Password for all users is: password123 (bcrypt hash)
-- ========================================================

-- Insert Categories
INSERT IGNORE INTO categories (id, name, description) VALUES
(1, 'Electronics', 'Laptops, phones, chargers, headphones, calculators'),
(2, 'Clothing', 'Jackets, hoodies, caps, umbrellas, scarves'),
(3, 'ID/Wallets', 'Student ID cards, wallets, driver licenses, keys'),
(4, 'Books/Notes', 'Textbooks, notebooks, binders, course files'),
(5, 'Accessories', 'Water bottles, watches, jewelry, glasses');

-- Insert Locations
INSERT IGNORE INTO locations (id, name, building, floor, description) VALUES
(1, 'Main Library Entrance', 'Library', '1', 'Near security turnstiles'),
(2, 'Central Library 2nd Floor', 'Library', '2', 'Quiet study tables near windows'),
(3, 'Science Lab 101', 'Science Complex', '1', 'Chemistry laboratory'),
(4, 'Student Union Cafeteria', 'Student Union', '1', 'Main dining area tables'),
(5, 'Campus Sports Arena', 'Recreation Center', '1', 'Bleachers & locker area'),
(6, 'Computer Science Lab 3', 'Tech Block', '3', 'Coding workstation lab');

-- Insert Users (Passwords are 'password123')
INSERT IGNORE INTO users (id, name, email, password_hash, role, phone, is_active) VALUES
(1, 'Alice Smith', 'alice@campus.edu', '$2b$12$dyiTf7lLZ5izQh6sjMLi.OsRq3npvCzpAstCyo4b2GyBMFWaV.nJG', 'STUDENT', '+1-555-0101', TRUE),
(2, 'Bob Jones', 'bob@campus.edu', '$2b$12$dyiTf7lLZ5izQh6sjMLi.OsRq3npvCzpAstCyo4b2GyBMFWaV.nJG', 'STUDENT', '+1-555-0102', TRUE),
(3, 'Charlie Brown', 'charlie@campus.edu', '$2b$12$dyiTf7lLZ5izQh6sjMLi.OsRq3npvCzpAstCyo4b2GyBMFWaV.nJG', 'STUDENT', '+1-555-0103', TRUE),
(4, 'David Miller', 'david@campus.edu', '$2b$12$dyiTf7lLZ5izQh6sjMLi.OsRq3npvCzpAstCyo4b2GyBMFWaV.nJG', 'STUDENT', '+1-555-0104', TRUE),
(5, 'Emma Watson', 'emma@campus.edu', '$2b$12$dyiTf7lLZ5izQh6sjMLi.OsRq3npvCzpAstCyo4b2GyBMFWaV.nJG', 'STUDENT', '+1-555-0105', TRUE),
(6, 'Sarah Staff', 'staff@campus.edu', '$2b$12$dyiTf7lLZ5izQh6sjMLi.OsRq3npvCzpAstCyo4b2GyBMFWaV.nJG', 'STAFF', '+1-555-0201', TRUE),
(7, 'Admin User', 'admin@campus.edu', '$2b$12$dyiTf7lLZ5izQh6sjMLi.OsRq3npvCzpAstCyo4b2GyBMFWaV.nJG', 'ADMIN', '+1-555-0301', TRUE);
