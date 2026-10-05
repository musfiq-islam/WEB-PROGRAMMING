<?php
// includes/rides_helpers.php — shared by every rides/* and requests/* endpoint.

require_once __DIR__ . '/db.php';

const UIU_CAMPUS_TOKEN = 'uiu campus';

function touches_uiu_campus(string $pickup, string $destination): bool {
    $p = mb_strtolower(trim($pickup));
    $d = mb_strtolower(trim($destination));
    // Exactly one end must be UIU (not both, not neither).
    return (strpos($p, UIU_CAMPUS_TOKEN) !== false) !== (strpos($d, UIU_CAMPUS_TOKEN) !== false);
}

function ride_with_driver(array $ride): array {
    $driver = db_query_one(
        'SELECT d.id AS driver_id, d.rating_sum, d.rating_count, d.completed_rides,
                u.id AS driver_user_id, u.name AS driver_name, u.is_verified AS driver_verified
         FROM drivers d JOIN users u ON u.id = d.user_id
         WHERE d.id = ?',
        [$ride['driver_id']]
    );
    if ($driver) {
        $avg = $driver['rating_count'] > 0 ? round($driver['rating_sum'] / $driver['rating_count'], 1) : null;
        $ride['driver'] = [
            'id'             => $driver['driver_user_id'],
            'name'           => $driver['driver_name'],
            'verified'       => (bool) $driver['driver_verified'],
            'rating'         => $avg,
            'completedRides' => (int) $driver['completed_rides'],
        ];
    }
    return $ride;
}
