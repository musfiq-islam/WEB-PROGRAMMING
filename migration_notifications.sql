-- UIU Ride migration: driver-offer notifications for community posts.
-- Run once on an EXISTING database (after migration_community_proposals.sql).
-- Fresh installs using database/schema.sql already include this.

USE uiu_ride;

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

