<?php
// api/request.php?id=7 — PATCH { status: "accepted" | "rejected" } — owning driver only
require_once __DIR__ . '/../includes/auth.php';

require_method('PATCH');
$user = require_login();
$reqId = (int) ($_GET['id'] ?? 0);
if (!$reqId) {
    api_error(400, 'Missing request id');
}

$req = db_query_one('SELECT * FROM ride_requests WHERE id = ?', [$reqId]);
if (!$req) {
    api_error(404, 'Request not found');
}
$ride = db_query_one('SELECT * FROM rides WHERE id = ?', [$req['ride_id']]);
$driver = driver_profile_for_user($user['id']);
if ($user['role'] !== 'driver' || !$driver || (int) $ride['driver_id'] !== (int) $driver['id']) {
    api_error(403, 'Only the driver who offered this ride can decide requests');
}

$body = read_json_body();
$decision = $body['status'] ?? null;
if (!in_array($decision, ['accepted', 'rejected'], true)) {
    api_error(400, "Status must be 'accepted' or 'rejected'");
}
if ($req['status'] !== 'pending') {
    api_error(400, 'This request has already been decided');
}
if ($decision === 'accepted') {
    if ($req['seats'] > $ride['available_seats']) {
        api_error(400, 'Not enough seats left to accept this request');
    }
    db_execute('UPDATE rides SET available_seats = available_seats - ? WHERE id = ?', [$req['seats'], $ride['id']]);
}
db_execute('UPDATE ride_requests SET status = ?, decided_at = NOW() WHERE id = ?', [$decision, $reqId]);

$updated = db_query_one('SELECT * FROM ride_requests WHERE id = ?', [$reqId]);
json_response(200, $updated);
