-- Smart Campus Lost & Found System - Analytics & Demo Queries
-- ==================================================
USE smart_campus;

-- 1. Get all currently ACTIVE lost items with category and location details
-- Demonstrates: INNER JOIN, selecting specific columns
SELECT 
    l.id, 
    l.title, 
    c.name AS category, 
    loc.name AS location, 
    l.lost_date,
    u.name AS reported_by
FROM lost_items l
INNER JOIN categories c ON l.category_id = c.id
INNER JOIN locations loc ON l.location_id = loc.id
INNER JOIN users u ON l.user_id = u.id
WHERE l.status = 'ACTIVE'
ORDER BY l.lost_date DESC;

-- 2. Find high probability matches (Score >= 80) that haven't been claimed yet
-- Demonstrates: JOINs, Filtering on multiple tables
SELECT 
    m.id AS match_id,
    m.match_score,
    l.title AS lost_title,
    f.title AS found_title,
    c.name AS category
FROM matches m
INNER JOIN lost_items l ON m.lost_item_id = l.id
INNER JOIN found_items f ON m.found_item_id = f.id
INNER JOIN categories c ON l.category_id = c.id
WHERE m.match_score >= 80.00 
  AND m.status = 'SUGGESTED'
ORDER BY m.match_score DESC;

-- 3. Staff Dashboard: View all PENDING claims with their associated item details
SELECT 
    c.id AS claim_id,
    u.name AS claimant_name,
    c.submitted_at,
    l.title AS claimed_item,
    f.title AS found_item_match,
    m.match_score
FROM claims c
INNER JOIN users u ON c.claimant_id = u.id
INNER JOIN matches m ON c.match_id = m.id
INNER JOIN lost_items l ON m.lost_item_id = l.id
INNER JOIN found_items f ON m.found_item_id = f.id
WHERE c.status = 'PENDING';

-- 4. Recovery Statistics: Count of items returned vs still lost, grouped by category
-- Demonstrates: GROUP BY, COUNT, CASE, SUM, Aggregate Functions
SELECT 
    cat.name AS category,
    COUNT(l.id) AS total_reported_lost,
    SUM(CASE WHEN l.status = 'RECOVERED' THEN 1 ELSE 0 END) AS successfully_recovered,
    SUM(CASE WHEN l.status = 'ACTIVE' THEN 1 ELSE 0 END) AS currently_active,
    ROUND(
        (SUM(CASE WHEN l.status = 'RECOVERED' THEN 1 ELSE 0 END) / COUNT(l.id)) * 100, 
    2) AS recovery_rate_percentage
FROM categories cat
LEFT JOIN lost_items l ON cat.id = l.category_id
GROUP BY cat.id, cat.name
HAVING total_reported_lost > 0
ORDER BY recovery_rate_percentage DESC;

-- 5. Location Hotspots: Where are the most items being found?
-- Demonstrates: GROUP BY, aggregate counting
SELECT 
    loc.building,
    loc.name AS specific_location,
    COUNT(f.id) AS items_found_here
FROM locations loc
LEFT JOIN found_items f ON loc.id = f.location_id
GROUP BY loc.id, loc.building, loc.name
HAVING items_found_here > 0
ORDER BY items_found_here DESC;

-- 6. User History: All activity (lost reports and found reports) for a specific user
-- Demonstrates: UNION ALL, adding a static type column
SELECT 
    'LOST' AS report_type,
    id,
    title,
    status,
    created_at
FROM lost_items
WHERE user_id = 1
UNION ALL
SELECT 
    'FOUND' AS report_type,
    id,
    title,
    status,
    created_at
FROM found_items
WHERE user_id = 1
ORDER BY created_at DESC;

-- 7. Audit Log Analysis: Who is approving the most claims?
-- Demonstrates: Subqueries
SELECT 
    staff_name,
    total_approvals
FROM (
    SELECT 
        u.name AS staff_name,
        COUNT(a.id) AS total_approvals
    FROM audit_logs a
    INNER JOIN users u ON a.user_id = u.id
    WHERE a.action = 'APPROVE_CLAIM'
    GROUP BY u.id, u.name
) AS approval_stats
ORDER BY total_approvals DESC;

-- 8. Identify Bottlenecks: Average time taken to verify a claim
-- Demonstrates: TIMESTAMPDIFF, AVG
SELECT 
    AVG(TIMESTAMPDIFF(HOUR, c.submitted_at, v.verified_at)) AS avg_verification_time_hours,
    MIN(TIMESTAMPDIFF(HOUR, c.submitted_at, v.verified_at)) AS fastest_verification,
    MAX(TIMESTAMPDIFF(HOUR, c.submitted_at, v.verified_at)) AS slowest_verification
FROM claims c
INNER JOIN verifications v ON c.id = v.claim_id
WHERE c.status = 'APPROVED';
