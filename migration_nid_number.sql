-- UIU Ride migration: driver NID number (no photo, no NID PDF).
-- Run once on an EXISTING database (phpMyAdmin > uiu_ride > SQL tab).
-- Fresh installs using database/schema.sql already include this.
-- If you previously ran the old migration_photo_nid.sql, the second part
-- removes the now-unused photo / NID PDF columns.

USE uiu_ride;

-- 1) Only if drivers.nid_number does not exist yet:
-- ALTER TABLE drivers ADD COLUMN nid_number VARCHAR(20) NULL AFTER license_number;

-- 2) Only if the old columns exist:
-- ALTER TABLE users   DROP COLUMN avatar_url;
-- ALTER TABLE drivers DROP COLUMN nid_pdf_path;
