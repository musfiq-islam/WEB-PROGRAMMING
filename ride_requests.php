<?php
// api/ride_requests.php?ride_id=5
//   POST { seats, message } — rider requests seats on this ride
//   GET  — owning driver lists all requests for this ride
require_once __DIR__ . '/../includes/auth.php';

$user = require_login();
$rideId = (int) ($_GET['ride_id'] ?? 0);
if (!$rideId) {
    api_error(400, 'Missing ride_id');
}
$ride = db_query_one('SELECT * FROM rides WHERE id = ?', [$rideId]);
if (!$ride) {
    api_error(404, 'Ride not found');
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!in_array($user['role'], RIDER_ROLES, true)) {
        api_error(403, 'Only students/faculty can request seats on a ride');
    }
    if ($ride['status'] !== 'scheduled') {
        api_error(400, 'This ride is no longer accepting requests');
    }

    $body = read_json_body();
    $seats = (int) ($body['seats'] ?? 1);
    if ($seats < 1) {
        api_error(400, 'Seats requested must be at least 1');
    }
    if ($seats > $ride['available_seats']) {
        api_error(400, 'Not enough available seats on this ride');
    }
    if (db_query_one('SELECT id FROM ride_requests WHERE ride_id = ? AND rider_id = ?', [$rideId, $user['id']])) {
        api_error(409, 'You already requested a seat on this ride');
    }

    $reqId = db_execute(
        'INSERT INTO ride_requests (ride_id, rider_id, seats, message) VALUES (?, ?, ?, ?)',
        [$rideId, $user['id'], $seats, trim($body['message'] ?? '') ?: null]
    );
    $request = db_query_one('SELECT * FROM ride_requests WHERE id = ?', [$reqId]);
    json_response(201, $request);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $driver = driver_profile_for_user($user['id']);
    if ($user['role'] !== 'driver' || !$driver || (int) $ride['driver_id'] !== (int) $driver['id']) {
        api_error(403, 'Only the driver who offered this ride can view its requests');
    }
    $requests = db_query(
        'SELECT rr.*, u.name AS rider_name, u.phone AS rider_phone, u.is_verified AS rider_verified
         FROM ride_requests rr JOIN users u ON u.id = rr.rider_id
         WHERE rr.ride_id = ? ORDER BY rr.requested_at',
        [$rideId]
    );
    json_response(200, $requests);
}

api_error(405, 'Method not allowed');
