-- Smart Campus Lost & Found System - MySQL 8 Schema
-- ==================================================

CREATE DATABASE IF NOT EXISTS smart_campus;
USE smart_campus;

-- 1. USERS
CREATE TABLE users (
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

-- 2. CATEGORIES
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
) ENGINE=InnoDB;

-- 3. LOCATIONS
CREATE TABLE locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    building VARCHAR(100),
    floor VARCHAR(50),
    description TEXT
) ENGINE=InnoDB;

-- 4. LOST ITEMS
CREATE TABLE lost_items (
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
CREATE INDEX idx_lost_status ON lost_items(status);
CREATE INDEX idx_lost_date ON lost_items(lost_date);
-- Composite index to speed up coarse matching filters
CREATE INDEX idx_lost_search ON lost_items(status, category_id, location_id);

-- 5. FOUND ITEMS
CREATE TABLE found_items (
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
CREATE INDEX idx_found_status ON found_items(status);
CREATE INDEX idx_found_date ON found_items(found_date);
-- Composite index to speed up coarse matching filters
CREATE INDEX idx_found_search ON found_items(status, category_id, location_id);

-- 6. MATCHES
CREATE TABLE matches (
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

CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_lost ON matches(lost_item_id);
CREATE INDEX idx_matches_found ON matches(found_item_id);

-- 7. CLAIMS
CREATE TABLE claims (
    id INT AUTO_INCREMENT PRIMARY KEY,
    match_id INT NOT NULL,
    claimant_id INT NOT NULL,
    proof_details TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    reviewed_by INT NULL,
    CONSTRAINT chk_claim_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    CONSTRAINT fk_claim_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    CONSTRAINT fk_claim_claimant FOREIGN KEY (claimant_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_claim_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    -- Prevent duplicate active claims by same user for same match
    CONSTRAINT uq_claim_match_claimant UNIQUE (match_id, claimant_id)
) ENGINE=InnoDB;

CREATE INDEX idx_claims_status ON claims(status);

-- 8. VERIFICATIONS
CREATE TABLE verifications (
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

-- 9. HANDOVERS
CREATE TABLE handovers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    claim_id INT NOT NULL UNIQUE,
    staff_id INT NOT NULL,
    handover_location VARCHAR(150) NOT NULL,
    handover_time TIMESTAMP NOT NULL,
    notes TEXT,
    CONSTRAINT fk_handover_claim FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE,
    CONSTRAINT fk_handover_staff FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 10. AUDIT LOGS
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    entity_type VARCHAR(50) NOT NULL, -- e.g., 'CLAIM', 'LOST_ITEM'
    entity_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
