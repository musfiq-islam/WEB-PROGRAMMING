<?php
// api/requests_mine.php — GET: the logged-in rider's own ride requests
require_once __DIR__ . '/../includes/auth.php';

require_method('GET');
$user = require_login();
if (!in_array($user['role'], RIDER_ROLES, true)) {
    api_error(403, 'Only students/faculty have ride requests');
}

$requests = db_query(
    'SELECT rr.*, r.pickup, r.destination, r.ride_date, r.ride_time,
            r.vehicle_type, r.vehicle_model, r.fare_per_person, r.status AS ride_status
     FROM ride_requests rr JOIN rides r ON r.id = rr.ride_id
     WHERE rr.rider_id = ? ORDER BY rr.requested_at DESC',
    [$user['id']]
);
json_response(200, $requests);
