-- UIU Ride migration: community ride proposals.
-- Run once on an EXISTING database (phpMyAdmin > uiu_ride > SQL tab).
-- Fresh installs using database/schema.sql already include this.

USE uiu_ride;

ALTER TABLE rides ADD COLUMN community_post_id INT NULL AFTER notes;
CREATE INDEX idx_rides_post ON rides(community_post_id);
