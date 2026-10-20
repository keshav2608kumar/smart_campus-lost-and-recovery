-- Smart Campus Lost & Found System - Demo Seed Data
-- ==================================================

USE smart_campus;

-- Disable foreign key checks to allow clean inserts
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE audit_logs;
TRUNCATE TABLE handovers;
TRUNCATE TABLE verifications;
TRUNCATE TABLE claims;
TRUNCATE TABLE matches;
TRUNCATE TABLE found_items;
TRUNCATE TABLE lost_items;
TRUNCATE TABLE locations;
TRUNCATE TABLE categories;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. USERS
-- (Passwords are hashed 'password123' using bcrypt for demo purposes)
INSERT INTO users (id, name, email, password_hash, role, phone) VALUES
(1, 'Alice Smith', 'alice@campus.edu', '$2b$12$R.R8z5qFhXvB1ZzK3I7eKu9/eKqFv6.YqXv1ZzK3I7eKu9/eKqFv', 'STUDENT', '555-0101'),
(2, 'Bob Jones', 'bob@campus.edu', '$2b$12$R.R8z5qFhXvB1ZzK3I7eKu9/eKqFv6.YqXv1ZzK3I7eKu9/eKqFv', 'STUDENT', '555-0102'),
(3, 'Charlie Brown', 'charlie@campus.edu', '$2b$12$R.R8z5qFhXvB1ZzK3I7eKu9/eKqFv6.YqXv1ZzK3I7eKu9/eKqFv', 'STUDENT', '555-0103'),
(4, 'Sarah Staff', 'staff@campus.edu', '$2b$12$R.R8z5qFhXvB1ZzK3I7eKu9/eKqFv6.YqXv1ZzK3I7eKu9/eKqFv', 'STAFF', '555-0201'),
(5, 'Admin User', 'admin@campus.edu', '$2b$12$R.R8z5qFhXvB1ZzK3I7eKu9/eKqFv6.YqXv1ZzK3I7eKu9/eKqFv', 'ADMIN', '555-0301');

-- 2. CATEGORIES
INSERT INTO categories (id, name, description) VALUES
(1, 'Electronics', 'Laptops, phones, tablets, headphones'),
(2, 'Clothing', 'Jackets, hats, scarves, gloves'),
(3, 'ID/Wallets', 'Student IDs, driver licenses, wallets, credit cards'),
(4, 'Books/Notes', 'Textbooks, notebooks, binders'),
(5, 'Accessories', 'Water bottles, umbrellas, keys, glasses');

-- 3. LOCATIONS
INSERT INTO locations (id, name, building, floor, description) VALUES
(1, 'Main Library Entrance', 'Library', '1', 'Near the main security desk'),
(2, 'Library Reading Room A', 'Library', '2', 'Quiet study area on the second floor'),
(3, 'Science Lab 101', 'Science Building', '1', 'Freshman chemistry lab'),
(4, 'Student Union Cafeteria', 'Student Union', '1', 'Main dining area'),
(5, 'Gym Locker Room', 'Recreation Center', 'B1', 'Men''s locker room');

-- 4. LOST ITEMS
INSERT INTO lost_items (id, user_id, category_id, location_id, title, description, color, brand, unique_features, lost_date, lost_time, status) VALUES
(1, 1, 1, 2, 'Lost AirPods Pro', 'Left my AirPods on the table by the window.', 'White', 'Apple', 'Scratch on the left side of the case', CURDATE() - INTERVAL 2 DAY, '14:30:00', 'RECOVERED'),
(2, 2, 4, 3, 'Calculus Textbook', 'Thick blue math book with my name inside.', 'Blue', 'Pearson', 'Name Bob Jones written on page 1', CURDATE() - INTERVAL 5 DAY, '10:00:00', 'ACTIVE'),
(3, 3, 5, 4, 'Hydroflask', 'Covered in stickers.', 'Black', 'Hydroflask', 'Has a NASA sticker and a dent on bottom', CURDATE() - INTERVAL 1 DAY, '12:15:00', 'MATCHED');

-- 5. FOUND ITEMS
INSERT INTO found_items (id, user_id, category_id, location_id, title, description, color, brand, unique_features, found_date, found_time, status) VALUES
(1, 2, 1, 2, 'Found White AirPods', 'Found these near the windows in the reading room.', 'White', 'Apple', 'Small scratch on the case', CURDATE() - INTERVAL 2 DAY, '15:00:00', 'RETURNED'),
(2, 1, 5, 4, 'Black Water Bottle', 'Black metal bottle left on a cafeteria table.', 'Black', 'Hydroflask', 'Dented bottom, multiple stickers including space themes', CURDATE() - INTERVAL 1 DAY, '12:30:00', 'CLAIMED'),
(3, 3, 2, 5, 'Grey Hoodie', 'Nike hoodie left on a bench', 'Grey', 'Nike', 'Size Large, slightly torn drawcord', CURDATE(), '08:00:00', 'AVAILABLE');

-- 6. MATCHES
INSERT INTO matches (id, lost_item_id, found_item_id, match_score, matching_details, status) VALUES
-- Match for AirPods (Fully Recovered flow)
(1, 1, 1, 95.50, '{"category_match": true, "location_score": 20, "date_score": 15, "color_score": 10, "brand_score": 10, "desc_score": 8}', 'CONFIRMED'),
-- Match for Hydroflask (In Review flow)
(2, 3, 2, 88.00, '{"category_match": true, "location_score": 20, "date_score": 15, "color_score": 10, "brand_score": 10, "desc_score": 7}', 'UNDER_REVIEW');

-- 7. CLAIMS
-- Alice claims her AirPods (Approved workflow)
INSERT INTO claims (id, match_id, claimant_id, proof_details, status, submitted_at, reviewed_at, reviewed_by) VALUES
(1, 1, 1, 'I have the original box with the serial number and my phone connects to them automatically as "Alice AirPods".', 'APPROVED', NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 20 HOUR, 4);

-- Charlie claims his Hydroflask (Pending workflow)
INSERT INTO claims (id, match_id, claimant_id, proof_details, status, submitted_at, reviewed_at, reviewed_by) VALUES
(2, 2, 3, 'It has a NASA sticker and I have a photo of me holding it yesterday.', 'PENDING', NOW() - INTERVAL 2 HOUR, NULL, NULL);

-- 8. VERIFICATIONS
-- Staff validates Alice's AirPods
INSERT INTO verifications (id, claim_id, verifier_id, verification_notes, result, verified_at) VALUES
(1, 1, 4, 'Student provided serial number matching the device, and bluetooth paired successfully.', 'VALID', NOW() - INTERVAL 20 HOUR);

-- 9. HANDOVERS
-- Handover for Alice's AirPods
INSERT INTO handovers (id, claim_id, staff_id, handover_location, handover_time, notes) VALUES
(1, 1, 4, 'Campus Security Main Office', NOW() - INTERVAL 19 HOUR, 'ID checked, item handed over securely.');

-- 10. AUDIT LOGS
-- Demonstrating the logs generated by the AirPods workflow
INSERT INTO audit_logs (user_id, entity_type, entity_id, action, old_status, new_status, details) VALUES
(1, 'LOST_ITEM', 1, 'CREATE', NULL, 'ACTIVE', '{"title": "Lost AirPods Pro"}'),
(2, 'FOUND_ITEM', 1, 'CREATE', NULL, 'AVAILABLE', '{"title": "Found White AirPods"}'),
(NULL, 'MATCH', 1, 'SYSTEM_SUGGESTION', NULL, 'SUGGESTED', '{"score": 95.5}'),
(1, 'CLAIM', 1, 'SUBMIT_CLAIM', NULL, 'PENDING', '{"match_id": 1}'),
(1, 'MATCH', 1, 'UPDATE_STATUS', 'SUGGESTED', 'UNDER_REVIEW', '{"reason": "Claim submitted"}'),
(1, 'FOUND_ITEM', 1, 'UPDATE_STATUS', 'AVAILABLE', 'CLAIMED', '{"reason": "Claim submitted"}'),
(4, 'CLAIM', 1, 'APPROVE_CLAIM', 'PENDING', 'APPROVED', '{"verified_by": 4}'),
(4, 'FOUND_ITEM', 1, 'UPDATE_STATUS', 'CLAIMED', 'RETURNED', '{"reason": "Handover complete"}'),
(4, 'LOST_ITEM', 1, 'UPDATE_STATUS', 'MATCHED', 'RECOVERED', '{"reason": "Item returned to owner"}');
