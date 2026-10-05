<?php
// api/ride_rate.php?ride_id=5 — POST { stars, comment } — accepted rider only, ride must be completed
require_once __DIR__ . '/../includes/auth.php';

require_method('POST');
$user = require_login();
$rideId = (int) ($_GET['ride_id'] ?? 0);
if (!$rideId) {
    api_error(400, 'Missing ride_id');
}
$ride = db_query_one('SELECT * FROM rides WHERE id = ?', [$rideId]);
if (!$ride) {
    api_error(404, 'Ride not found');
}
if ($ride['status'] !== 'completed') {
    api_error(400, 'You can only rate a completed ride');
}
$accepted = db_query_one(
    "SELECT id FROM ride_requests WHERE ride_id = ? AND rider_id = ? AND status = 'accepted'",
    [$rideId, $user['id']]
);
if (!$accepted) {
    api_error(403, 'Only accepted passengers can rate this ride');
}

$body = read_json_body();
$stars = (int) ($body['stars'] ?? 0);
if ($stars < 1 || $stars > 5) {
    api_error(400, 'Stars must be between 1 and 5');
}
if (db_query_one('SELECT id FROM ratings WHERE ride_id = ? AND rider_id = ?', [$rideId, $user['id']])) {
    api_error(409, 'You already rated this ride');
}

db_execute(
    'INSERT INTO ratings (ride_id, rider_id, driver_id, stars, comment) VALUES (?, ?, ?, ?, ?)',
    [$rideId, $user['id'], $ride['driver_id'], $stars, trim($body['comment'] ?? '') ?: null]
);
db_execute(
    'UPDATE drivers SET rating_sum = rating_sum + ?, rating_count = rating_count + 1 WHERE id = ?',
    [$stars, $ride['driver_id']]
);
json_response(201, ['ok' => true]);
