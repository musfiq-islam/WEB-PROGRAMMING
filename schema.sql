-- =================================================================
-- UIU Ride — MySQL / MariaDB schema (for XAMPP)
-- Import this via phpMyAdmin ("Import" tab) or:
--   mysql -u root -p < database/schema.sql
-- =================================================================

CREATE DATABASE IF NOT EXISTS uiu_ride
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE uiu_ride;

-- ---------------------------------------------------------------
-- USERS — every account (student, faculty, driver)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    email           VARCHAR(190) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,      -- PHP password_hash() output
    role            ENUM('student','faculty','driver') NOT NULL,
    phone           VARCHAR(30),
    uiu_id          VARCHAR(50),                -- NULL for drivers
    department      VARCHAR(100),               -- NULL for drivers
    avatar_initials VARCHAR(5),
    is_verified     TINYINT(1) NOT NULL DEFAULT 0,
    status          ENUM('active','suspended') NOT NULL DEFAULT 'active',
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- DRIVERS — 1:1 extension of a driver-role user.
-- Vehicle info captured once, reused on every ride automatically.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS drivers (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL UNIQUE,
    vehicle_type    ENUM('Bike','Car','Other') NOT NULL,
    vehicle_model   VARCHAR(100) NOT NULL,
    vehicle_plate   VARCHAR(50) NOT NULL,
    license_number  VARCHAR(50) NOT NULL,
    nid_number      VARCHAR(20) NULL,           -- National ID number (required at registration)
    driver_status   ENUM('active','suspended') NOT NULL DEFAULT 'active',
    rating_sum      INT NOT NULL DEFAULT 0,
    rating_count    INT NOT NULL DEFAULT 0,
    completed_rides INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_drivers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- RIDES — offered exclusively by drivers.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rides (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    driver_id         INT NOT NULL,
    pickup            VARCHAR(190) NOT NULL,
    destination       VARCHAR(190) NOT NULL,
    ride_date         DATE NOT NULL,
    ride_time         TIME NOT NULL,
    total_seats       INT NOT NULL,
    available_seats   INT NOT NULL,
    fare_per_person   INT NOT NULL DEFAULT 0,
    notes             TEXT,
    community_post_id INT NULL,          -- set when a driver offers this ride for a community ride proposal
    vehicle_type      VARCHAR(20) NOT NULL,
    vehicle_model     VARCHAR(100) NOT NULL,
    vehicle_plate     VARCHAR(50) NOT NULL,
    status            ENUM('scheduled','active','completed','cancelled') NOT NULL DEFAULT 'scheduled',
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rides_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_rides_driver ON rides(driver_id);
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_rides_date   ON rides(ride_date);
CREATE INDEX idx_rides_post   ON rides(community_post_id);

-- ---------------------------------------------------------------
-- RIDE REQUESTS (bookings)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ride_requests (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    ride_id      INT NOT NULL,
    rider_id     INT NOT NULL,
    seats        INT NOT NULL DEFAULT 1,
    status       ENUM('pending','accepted','rejected','cancelled') NOT NULL DEFAULT 'pending',
    message      TEXT,
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_at   TIMESTAMP NULL,
    UNIQUE KEY uniq_ride_rider (ride_id, rider_id),
    CONSTRAINT fk_requests_ride  FOREIGN KEY (ride_id)  REFERENCES rides(id) ON DELETE CASCADE,
    CONSTRAINT fk_requests_rider FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_requests_ride  ON ride_requests(ride_id);
CREATE INDEX idx_requests_rider ON ride_requests(rider_id);

-- ---------------------------------------------------------------
-- COMMUNITY POSTS — students/faculty only
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS community_posts (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT NOT NULL,
    content      TEXT NOT NULL,
    pickup       VARCHAR(190),
    destination  VARCHAR(190),
    travel_date  DATE NULL,
    travel_time  TIME NULL,
    status       ENUM('open','closed') NOT NULL DEFAULT 'open',
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS community_interests (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    post_id    INT NOT NULL,
    user_id    INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_post_user (post_id, user_id),
    CONSTRAINT fk_interest_post FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_interest_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS community_comments (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    post_id    INT NOT NULL,
    user_id    INT NOT NULL,
    content    TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_comment_post FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- NOTIFICATIONS — a rider is told when a driver offers a ride for their post
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,              -- the rider who owns the community post
    post_id    INT NOT NULL,
    ride_id    INT NOT NULL,              -- the ride a driver offered for that post
    is_read    TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notif_post FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_notif_ride FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- RATINGS — riders rate drivers after a completed ride
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ratings (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    ride_id    INT NOT NULL,
    rider_id   INT NOT NULL,
    driver_id  INT NOT NULL,
    stars      TINYINT NOT NULL,
    comment    TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_ride_rider_rating (ride_id, rider_id),
    CONSTRAINT fk_rating_ride   FOREIGN KEY (ride_id)   REFERENCES rides(id) ON DELETE CASCADE,
    CONSTRAINT fk_rating_rider  FOREIGN KEY (rider_id)  REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_rating_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Note: PHP sessions (not a database table) handle login state — see
-- includes/auth.php. There is no hardcoded data in this file; use
-- database/seed.php (optional, run once) to add local test accounts.
