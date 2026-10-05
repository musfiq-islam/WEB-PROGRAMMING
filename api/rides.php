<?php
// api/rides.php
//   GET  ?pickup=&destination=&date=&seats=&vehicleType=   — search open rides (rider only)
//   POST { pickup, destination, date, time, seats, fare, notes } — offer a ride (driver only)
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/rides_helpers.php';
require_once __DIR__ . '/../includes/community_helpers.php';

$user = require_login();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    require_role($user, RIDER_ROLES); // drivers offer rides; they don't search for them

    $clauses = ["r.status = 'scheduled'", "r.available_seats > 0", "r.ride_date >= CURDATE()"];
    $params = [];

    if (!empty($_GET['pickup'])) {
        $clauses[] = 'LOWER(r.pickup) LIKE ?';
        $params[] = '%' . mb_strtolower($_GET['pickup']) . '%';
    }
    if (!empty($_GET['destination'])) {
        $clauses[] = 'LOWER(r.destination) LIKE ?';
        $params[] = '%' . mb_strtolower($_GET['destination']) . '%';
    }
    if (!empty($_GET['date'])) {
        $clauses[] = 'r.ride_date = ?';
        $params[] = $_GET['date'];
    }
    if (!empty($_GET['vehicleType'])) {
        $clauses[] = 'r.vehicle_type = ?';
        $params[] = $_GET['vehicleType'];
    }
    if (!empty($_GET['seats'])) {
        $clauses[] = 'r.available_seats >= ?';
        $params[] = (int) $_GET['seats'];
    }

    $sql = 'SELECT r.* FROM rides r WHERE ' . implode(' AND ', $clauses) . ' ORDER BY r.ride_date, r.ride_time';
    $rides = db_query($sql, $params);
    json_response(200, array_map('ride_with_driver', $rides));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($user['role'] !== 'driver') {
        api_error(403, 'Only registered drivers can offer rides');
    }
    $driver = driver_profile_for_user($user['id']);
    if (!$driver) {
        api_error(500, 'Driver profile not found for this account');
    }
    if (trim((string) ($driver['license_number'] ?? '')) === '') {
        api_error(400, 'A valid driving license number is required before offering a ride');
    }

    $body = read_json_body();
    require_fields($body, ['pickup', 'destination', 'date', 'time', 'seats']);

    if (!is_valid_date($body['date'])) {
        api_error(400, 'Date must be in YYYY-MM-DD format');
    }
    if (!is_valid_time($body['time'])) {
        api_error(400, 'Time must be in HH:MM 24-hour format');
    }
    if ($body['date'] < date('Y-m-d')) {
        api_error(400, 'Ride date cannot be in the past');
    }
    $seats = (int) $body['seats'];
    if ($seats < 1 || $seats > 10) {
        api_error(400, 'Seats must be between 1 and 10');
    }
    $fare = (int) ($body['fare'] ?? 0);
    if ($fare < 0) {
        api_error(400, 'Fare cannot be negative');
    }
    if (!touches_uiu_campus($body['pickup'], $body['destination'])) {
        api_error(400, 'Every ride must have UIU Campus as exactly one of pickup or destination (not both, not neither)');
    }

    // Optional: this ride answers a rider's community ride proposal.
    $postId = null;
    if (!empty($body['postId'])) {
        $post = db_query_one("SELECT id FROM community_posts WHERE id = ? AND status = 'open'", [(int) $body['postId']]);
        if (!$post) {
            api_error(400, 'That ride proposal is no longer open');
        }
        $postId = (int) $post['id'];
        if (driver_has_offered((int) $user['id'], $postId)) {
            api_error(409, 'You have already offered a ride for this proposal');
        }
    }

    // Vehicle info always comes from the driver's own stored profile —
    // never from the request body.
    $rideId = db_execute(
        'INSERT INTO rides (driver_id, pickup, destination, ride_date, ride_time,
                             total_seats, available_seats, fare_per_person, notes,
                             community_post_id, vehicle_type, vehicle_model, vehicle_plate)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
            $driver['id'], trim($body['pickup']), trim($body['destination']),
            $body['date'], $body['time'], $seats, $seats, $fare,
            trim($body['notes'] ?? '') ?: null,
            $postId,
            $driver['vehicle_type'], $driver['vehicle_model'], $driver['vehicle_plate'],
        ]
    );
    // Tell the rider who made the proposal that a driver has offered a ride.
    if ($postId) {
        $post = db_query_one('SELECT user_id FROM community_posts WHERE id = ?', [$postId]);
        if ($post) {
            db_execute('INSERT INTO notifications (user_id, post_id, ride_id) VALUES (?, ?, ?)',
                       [$post['user_id'], $postId, $rideId]);
        }
    }
    $ride = db_query_one('SELECT * FROM rides WHERE id = ?', [$rideId]);
    json_response(201, ride_with_driver($ride));
}

api_error(405, 'Method not allowed');
