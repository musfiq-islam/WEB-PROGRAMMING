<?php
// api/ride.php?id=5
//   GET   — ride details (any logged-in user)
//   PATCH { status } — update status (owning driver only)
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/rides_helpers.php';

$user = require_login();
$rideId = (int) ($_GET['id'] ?? 0);
if (!$rideId) {
    api_error(400, 'Missing ride id');
}

$ride = db_query_one('SELECT * FROM rides WHERE id = ?', [$rideId]);
if (!$ride) {
    api_error(404, 'Ride not found');
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    json_response(200, ride_with_driver($ride));
}

if ($_SERVER['REQUEST_METHOD'] === 'PATCH') {
    $driver = driver_profile_for_user($user['id']);
    if ($user['role'] !== 'driver' || !$driver || (int) $ride['driver_id'] !== (int) $driver['id']) {
        api_error(403, 'Only the driver who offered this ride can modify it');
    }

    $body = read_json_body();
    $status = $body['status'] ?? null;
    if ($status && !in_array($status, ['scheduled', 'active', 'completed', 'cancelled'], true)) {
        api_error(400, 'Invalid ride status');
    }
    if ($status) {
        db_execute('UPDATE rides SET status = ? WHERE id = ?', [$status, $ride['id']]);
        if ($status === 'completed') {
            db_execute('UPDATE drivers SET completed_rides = completed_rides + 1 WHERE id = ?', [$driver['id']]);
        }
    }
    $updated = db_query_one('SELECT * FROM rides WHERE id = ?', [$ride['id']]);
    json_response(200, ride_with_driver($updated));
}

api_error(405, 'Method not allowed');
