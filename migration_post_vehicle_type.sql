-- UIU Ride migration: vehicle type on community ride requests.
-- Run once on an EXISTING database (phpMyAdmin > uiu_ride > SQL tab).
-- Fresh installs using database/schema.sql already include this.

USE uiu_ride;

ALTER TABLE community_posts
    ADD COLUMN vehicle_type ENUM('Any','Bike','Car','Other') NOT NULL DEFAULT 'Any' AFTER travel_time;
