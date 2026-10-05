<?php
// includes/community_helpers.php
require_once __DIR__ . '/db.php';

function enrich_post(array $post, int $viewerId): array {
    $author = db_query_one(
        'SELECT id, name, role, is_verified, avatar_initials FROM users WHERE id = ?',
        [$post['user_id']]
    );
    $post['author'] = $author;
    $post['interestCount'] = (int) db_query_one(
        'SELECT COUNT(*) AS c FROM community_interests WHERE post_id = ?', [$post['id']]
    )['c'];
    $post['youAreInterested'] = (bool) db_query_one(
        'SELECT id FROM community_interests WHERE post_id = ? AND user_id = ?', [$post['id'], $viewerId]
    );
    $post['commentCount'] = (int) db_query_one(
        'SELECT COUNT(*) AS c FROM community_comments WHERE post_id = ?', [$post['id']]
    )['c'];
    // A post with both a pickup and a destination is a "ride proposal":
    // it is shown to every driver, who can answer it by offering a ride.
    $post['isProposal'] = !empty($post['pickup']) && !empty($post['destination']);
    $post['offerCount'] = (int) db_query_one(
        "SELECT COUNT(*) AS c FROM rides WHERE community_post_id = ? AND status IN ('scheduled','active')",
        [$post['id']]
    )['c'];
    $summary = db_query_one(
        "SELECT MIN(fare_per_person) AS minFare, MAX(fare_per_person) AS maxFare,
                GROUP_CONCAT(DISTINCT vehicle_type ORDER BY vehicle_type SEPARATOR ', ') AS vehicles
         FROM rides WHERE community_post_id = ? AND status IN ('scheduled','active')",
        [$post['id']]
    );
    $post['offerMinFare'] = $summary['minFare'] !== null ? (int) $summary['minFare'] : null;
    $post['offerMaxFare'] = $summary['maxFare'] !== null ? (int) $summary['maxFare'] : null;
    $post['offerVehicles'] = $summary['vehicles'] ?: null;
    // For drivers: have I already answered this proposal? (hides it from my portal)
    $post['youOffered'] = driver_has_offered($viewerId, (int) $post['id']);
    return $post;
}

/** True if this user (a driver) already has a live ride offered for the proposal. */
function driver_has_offered(int $userId, int $postId): bool {
    return (bool) db_query_one(
        "SELECT r.id FROM rides r JOIN drivers d ON d.id = r.driver_id
         WHERE d.user_id = ? AND r.community_post_id = ? AND r.status <> 'cancelled' LIMIT 1",
        [$userId, $postId]
    );
}

/** Rides that drivers have offered in answer to a community ride proposal. */
function post_offers(int $postId): array {
    return db_query(
        "SELECT r.id, r.pickup, r.destination, r.ride_date, r.ride_time, r.available_seats,
                r.fare_per_person, r.vehicle_type, r.status, u.name AS driver_name
         FROM rides r
         JOIN drivers d ON d.id = r.driver_id
         JOIN users u ON u.id = d.user_id
         WHERE r.community_post_id = ? AND r.status IN ('scheduled','active')
         ORDER BY r.created_at DESC",
        [$postId]
    );
}
