-- UIU Ride migration: make driving license mandatory for every driver.
-- For an existing database, fill any missing license_number values first, then run the ALTER.

USE uiu_ride;

-- Example (replace the value with the driver's real license number):
-- UPDATE drivers SET license_number = 'REPLACE_WITH_VALID_LICENSE'
-- WHERE license_number IS NULL OR TRIM(license_number) = '';

ALTER TABLE drivers
    MODIFY license_number VARCHAR(50) NOT NULL;
